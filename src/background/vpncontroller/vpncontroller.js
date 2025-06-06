/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { Component } from "../component.js";
import { Logger } from "../logger.js";
import { Utils } from "../../shared/utils.js";

import {
  IBindable,
  WritableProperty,
  propertySum,
  property,
} from "../../shared/property.js";
import { PropertyType } from "../../shared/ipc.js";

import {
  VPNState,
  StateVPNUnavailable,
  StateVPNEnabled,
  StateVPNDisabled,
  StateVPNSubscriptionNeeded,
  StateVPNOnPartial,
  REQUEST_TYPES,
  ServerCountry,
  vpnStatusResponse,
  StateVPNClosed,
  StateVPNSignedOut,
  StateVPNNeedsUpdate,
  VPNSettings,
  BridgeResponse,
} from "./states.js";

const log = Logger.logger("TabHandler");

/**
 * This class owns the Message Port to
 * talk to the Client.
 *
 * It allowes to observe the current State of The Client
 * and send Messages to obtain info
 */
export class VPNController extends Component {
  // Things to expose to the UI
  static properties = {
    servers: PropertyType.Bindable,
    isExcluded: PropertyType.Bindable,
    state: PropertyType.Bindable,
    postToApp: PropertyType.Function,
    isolationKey: PropertyType.Bindable,
    featureList: PropertyType.Bindable,
    settings: PropertyType.Bindable,
  };

  get state() {
    return this.#mState.readOnly;
  }
  get servers() {
    return this.#mServers;
  }
  /** @type {IBindable<FeatureFlags>} */
  get featureList() {
    return this.#mFeaturelist;
  }
  /** @type {IBindable<Array<String>>} */
  get interventions() {
    return this.#mInterventions;
  }
  get settings() {
    return this.#settings.readOnly;
  }

  initNativeMessaging() {
    log("initNativeMessaging");
    if (this.#port && this.#port.error === null) {
      return;
    }
    try {
      /*
                Find a way to not spam the console when MozillaVPN client is not installed
                File at path ".../../MozillaVPN/..." is not executable.` thrown by resource://gre/modules/Subprocess.jsm:152`
                Which does is not caught by this try/catch
            */
      this.#port = browser.runtime.connectNative("mozillavpn");
      this.#port.onMessage.addListener((response) =>
        this.handleResponse(response)
      );

      this.#postToAppInternal("servers");
      this.#postToAppInternal("status");

      // When the mozillavpn dies or the VPN disconnects, we need to increase
      // the isolation key in order to create new proxy connections. Otherwise
      // we could see random timeout when the browser tries to connect to an
      // invalid proxy connection.
      this.#port.onDisconnect.addListener((p) => {
        const uninstalledHints = [
          "An unexpected error occurred",
          "No such native application mozillavpn",
        ];
        // @ts-ignore
        if (uninstalledHints.includes(p.error.message)) {
          this.#port = null; // The port is invalid, so we should retry later.
          this.#mState.value = new StateVPNUnavailable();
          return;
        }
        this.#increaseIsolationKey();
        this.#mState.value = new StateVPNClosed();
      });
    } catch (e) {
      // If we get an exception here it is super likely the VPN is simply not installed.
      log(e);
      this.#mState.value = new StateVPNUnavailable();
      this.#port = null;
    }
  }

  async init() {
    this.#mState.value = new StateVPNUnavailable();
    this.#mServers.value = await fromStorage(
      browser.storage.local,
      MOZILLA_VPN_SERVERS_KEY,
      []
    );
    this.#mServers.subscribe((newServers) => {
      putIntoStorage(
        newServers,
        browser.storage.local,
        MOZILLA_VPN_SERVERS_KEY
      );
    });

    this.initNativeMessaging();

    // Whenever the applist changes, make sure we check if that is us.
    this.#mSplitTunnledApps.subscribe(() => {
      this.postToApp("proc_info");
    });
  }
  /**
   * Sends a message to the client
   * @param { string } command - Command to Send
   * @param { object } args - Argument blob
   */
  postToApp(command, args = {}) {
    if (!REQUEST_TYPES.includes(command)) {
      log(`Command ${command} not in known command list`);
    }
    if (command === "telemetry") {
      console.debug(args);
    }
    if (!this.#port) {
      this.initNativeMessaging();
      setTimeout(() => this.#postToAppInternal(command, args), 500);
    }
    this.#postToAppInternal(command, args);
  }
  #postToAppInternal(command = "", args = {}) {
    try {
      this.#port?.postMessage({ ...args, t: command });
    } catch (e) {
      log(e);
      // @ts-ignore
      if (e.message === "Attempt to postMessage on disconnected port") {
        this.#port = null; // The port is invalid, so we should retry later.
        this.#mState.value = new StateVPNClosed();
      }
    }
  }

  // Handle responses from MozillaVPN client
  async handleResponse(response) {
    console.debug(response);
    if (!response.t) {
      // The VPN Client always sends a ".t : string"
      // to determing the message type.
      // If it's not there it's from the bridge.
      this.handleBridgeResponse(response, this.#mState);
      return;
    }
    switch (response.t) {
      case "servers":
        if (
          !Utils.deepEquals(response.servers.countries, this.#mServers.value)
        ) {
          this.#mServers.set(response.servers.countries);
        }
        break;
      case "disabled_apps":
        if (
          !Utils.deepEquals(
            response.disabled_apps,
            this.#mSplitTunnledApps.value
          )
        ) {
          this.#mSplitTunnledApps.set(response.disabled_apps);
        }
        break;
      case "status":
        const newStatus = fromVPNStatusResponse(response, this.#mServers.value);
        if (newStatus) {
          if (!Utils.deepEquals(newStatus, this.#mState.value)) {
            this.#mState.set(newStatus);
          }
          // Let's increase the network key isolation at any vpn status change.
          this.#increaseIsolationKey();
        }
        break;
      case "interventions":
        const data = response.interventions;
        if (typeof data == typeof []) {
          this.#mInterventions.set(data);
        }
        break;
      case "featurelist":
        this.#mFeaturelist.set({
          ...new FeatureFlags(),
          ...response.featurelist,
        });
        break;
      case "settings":
        const settings = new VPNSettings();
        // Copy over all values that we expect to be in VPNSettings
        let keys = Object.keys(settings);
        keys.forEach((k) => {
          if (response.settings[k] != undefined) {
            settings[k] = response.settings[k];
          }
        });
        if (!Utils.deepEquals(settings, this.#settings.value)) {
          this.#settings.set(settings);
        }
        break;
      default:
        console.debug("Unexpected Message type: " + response.t);
    }
  }

  /**
   * Handles a response from the native messaging brige
   * @param {BridgeResponse} response - The Reponse object from the NM Bridge
   * @param {WritableProperty<VPNState>} state - the current state
   * @returns - Nothing, but may write to state, or post messages to the bridge.
   */
  async handleBridgeResponse(response, state) {
    const currentState = state.value;
    // We can only get 2 types of messages right now: client-down/up
    if (response.exe) {
      this.#mParentProcess.set(response.exe);
    }

    if (
      (response.status && response.status === "vpn-client-down") ||
      (response.error && response.error === "vpn-client-down")
    ) {
      // If we have been considering the client open, it is now closed.
      if (currentState.alive) {
        state.set(new StateVPNClosed());
        return;
      }
      // If we considered the client uninstalled, it is now installed.
      if (!currentState.installed) {
        state.set(new StateVPNClosed());
        return;
      }
    }
    if (response.status && response.status === "vpn-client-up") {
      queueMicrotask(() => {
        this.postToApp("featurelist");
        this.postToApp("status");
        this.postToApp("servers");
        this.postToApp("disabled_apps");
        this.postToApp("settings");
      });
      return;
    }
  }

  /**
   * The isolation key is used to make sure
   * for each unique vpn session we get a
   * unique proxy connection, so that
   * when the vpn reconnects an old proxy
   * tcp handle (which is now invalid) is not reused.
   *
   * @readonly
   * @type {IBindable<Number>}
   */
  get isolationKey() {
    return this.#isolationKey;
  }

  #increaseIsolationKey() {
    this.#isolationKey.set(this.#isolationKey.value++);
  }

  /** @type {browser.runtime.Port?} */
  #port = null;
  #isolationKey = property(0);

  #mState = property(new VPNState());
  /** @type {WritableProperty<Array<ServerCountry>>} */
  // @ts-ignore
  #mServers = property([]);

  #mFeaturelist = property(new FeatureFlags());

  #mSplitTunnledApps = property([]);
  #mParentProcess = property("");
  #mInterventions = property([]);
  #settings = property(new VPNSettings());

  isExcluded = propertySum(
    isSplitTunnled,
    this.#mParentProcess,
    this.#mSplitTunnledApps
  );
}

export function isSplitTunnled(parent = "", apps = [""]) {
  if (parent == "") {
    return false;
  }
  if (apps.length == 0) {
    return false;
  }
  return apps.some((app) => app === parent.replaceAll("\\", "/"));
}

const MOZILLA_VPN_SERVERS_KEY = "mozillaVpnServers";

/**
   * fetches data from storage
 
   * @template T
   * @param {browser.storage.StorageArea} storage - The storage area to look for
   * @param {String} key - The key to put the state in
   * @param {T} defaultValue - The Default value, in case it does not exist. 
   * @returns {Promise<T>} - Returns a copy of the state, or the same in case of missing data.
   */
export async function fromStorage(
  storage = browser.storage.local,
  key,
  defaultValue
) {
  const storageRetrieval = await storage.get(key);
  if (typeof storageRetrieval === "undefined") {
    return defaultValue;
  }
  const returnValue = storageRetrieval[key];

  if (typeof returnValue === "undefined") {
    return defaultValue;
  }
  // @ts-ignore
  return returnValue;
}

/**  data into storage, to make sure we can recreate it next time using
 * @param {any} data - The state to replicate
 * @param {browser.storage.StorageArea} storage - The storage area to look for
 * @param {String} key - The key to put the state in
 */
export function putIntoStorage(
  data = {},
  storage = browser.storage.local,
  key
) {
  // @ts-ignore
  storage.set({ [key]: data });
}

/**
 * Take a VPN Status Response message, and returns an Extension State Object.
 * @param {vpnStatusResponse} response - What the VPN sent
 * @param {Array<ServerCountry>} serverList - The Current Serverlist
 * @returns
 */

export function fromVPNStatusResponse(
  response = new vpnStatusResponse(),
  serverList = []
) {
  if (response.t != "status") {
    return;
  }
  const servers = serverList;
  const status = response.status;
  const appState = status.app;

  const version = status.version;

  if (!version || !Utils.isViableClientVersion(version)) {
    return new StateVPNNeedsUpdate();
  }

  if (["StateInitialize", "StateAuthenticating"].includes(appState)) {
    return new StateVPNSignedOut();
  }

  if (appState === "StateSubscriptionNeeded") {
    return new StateVPNSubscriptionNeeded();
  }

  const resolveCity = (countryCode, cityName) => {
    const country = serverList.find((country) => country.code === countryCode);
    const city = country?.cities.find((city) => city.name === cityName);
    return { country, city };
  };

  //
  const controllerState = status.vpn;
  const { country: entryServerCountry, city: entryServerCity } = resolveCity(
    status.location["entry_country_code"],
    status.location["entry_city_name"]
  );
  const { country: exitServerCountry, city: exitServerCity } = resolveCity(
    status.location["exit_country_code"],
    status.location["exit_city_name"]
  );

  if (controllerState === "StateOn") {
    return new StateVPNEnabled(
      entryServerCity,
      entryServerCountry,
      exitServerCity,
      exitServerCountry,
      status.localProxy?.url,
      status.connectionHealth
    );
  }
  if (controllerState === "StateOnPartial") {
    return new StateVPNOnPartial(
      entryServerCity,
      entryServerCountry,
      exitServerCity,
      exitServerCountry,
      status.localProxy?.url,
      status.connectionHealth
    );
  }
  if (
    controllerState === "StateOff" ||
    controllerState === "StateDisconnecting"
  ) {
    return new StateVPNDisabled(
      entryServerCity,
      entryServerCountry,
      exitServerCity,
      exitServerCountry
    );
  }
  return;
}

export class FeatureFlags {
  localProxy = true;
  webExtension = false;
}
