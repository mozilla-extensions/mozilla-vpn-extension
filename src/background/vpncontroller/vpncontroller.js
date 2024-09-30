/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { Component } from "../component.js";
import { Logger } from "../logger.js";

import {
  IBindable,
  WritableProperty,
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
  };

  get state() {
    return this.#mState.readOnly;
  }
  get servers() {
    return this.#mServers;
  }
  get isExcluded() {
    return this.#isExcluded;
  }
  /** @type {IBindable<FeatureFlags>} */
  get featureList() {
    return this.#mFeaturelist;
  }

  async initNativeMessaging() {
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

      this.postToApp("servers");
      this.postToApp("status");

      // When the mozillavpn dies or the VPN disconnects, we need to increase
      // the isolation key in order to create new proxy connections. Otherwise
      // we could see random timeout when the browser tries to connect to an
      // invalid proxy connection.
      this.#port.onDisconnect.addListener(() => {
        this.#increaseIsolationKey();
        this.#mState.value = new StateVPNClosed();
      });
    } catch (e) {
      // If we get an exception here it is super likely the VPN is simply not installed.
      log(e);
      this.#mState.value = new StateVPNUnavailable();
    }
  }

  async init() {
    this.#mState.value = new StateVPNClosed();
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
  }
  /**
   * Sends a message to the client
   * @param { string } command - Command to Send
   */
  postToApp(command) {
    try {
      if (!REQUEST_TYPES.includes(command)) {
        log(`Command ${command} not in known command list`);
      }
      this.#port?.postMessage({ t: command });
    } catch (e) {
      log(e);
      // @ts-ignore
      if (e.toString() === "Attempt to postMessage on disconnected port") {
        this.#mState.value = new StateVPNClosed();
      }
    }
  }

  // Handle responses from MozillaVPN client
  async handleResponse(response) {
    console.log(response);
    if (!response.t) {
      // The VPN Client always sends a ".t : string"
      // to determing the message type.
      // If it's not there it's from the bridge.
      this.handleBridgeResponse(response);
      return;
    }
    switch (response.t) {
      case "servers":
        this.#mServers.set(response.servers.countries);
        break;
      case "disabled_apps":
        this.#isExcluded.set(isSplitTunnled(response));
        break;
      case "status":
        const newStatus = fromVPNStatusResponse(response, this.#mServers.value);
        if (newStatus) {
          this.#mState.set(newStatus);
          // Let's increase the network key isolation at any vpn status change.
          this.#increaseIsolationKey();
        }
        break;
      case "featurelist":
        this.#mFeaturelist.set({
          ...new FeatureFlags(),
          ...response.featurelist,
        });
      default:
        console.log("Unexpected Message type: " + response.t);
    }
  }

  // Called in case we get the message directly from
  // the native messaging bridge, not the client
  async handleBridgeResponse(response) {
    // We can only get 2 types of messages right now: client-down/up
    if (response.status && response.status === "vpn-client-down") {
      if (this.#mState.value.alive) {
        this.#mState.value = new StateVPNClosed();
      }
      return;
    }
    // The VPN Just started && connected to Native Messaging
    if (response.status && response.status === "vpn-client-up") {
      queueMicrotask(() => {
        this.postToApp("status");
        this.postToApp("servers");
        this.postToApp("disabled_apps");
        this.postToApp("featurelist");
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

  #isExcluded = property(false);
}

export function isSplitTunnled(
  response = {
    t: "disabled_apps",
    disabled_apps: [""],
  }
) {
  if (response.t != "disabled_apps") {
    throw new Error("passed an invalid response");
  }
  // Todo: THIS IS STILL HACKY
  const search_terms = ["firefox.exe", "firefox"];
  let apps = response.disabled_apps;
  apps ??= [];
  const isFirefoxExcluded = apps.some((path) => {
    return search_terms.some((searchPath) => {
      return path.endsWith(searchPath);
    });
  });
  return isFirefoxExcluded;
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
async function fromStorage(
  storage = browser.storage.local,
  key = MOZILLA_VPN_SERVERS_KEY,
  defaultValue
) {
  const { mozillaVpnServers } = await storage.get(key);
  if (typeof mozillaVpnServers === "undefined") {
    return defaultValue;
  }
  // @ts-ignore
  return mozillaVpnServers;
}

/**  data into storage, to make sure we can recreate it next time using
 * @param {any} data - The state to replicate
 * @param {browser.storage.StorageArea} storage - The storage area to look for
 * @param {String} key - The key to put the state in
 */
function putIntoStorage(
  data = {},
  storage = browser.storage.local,
  key = MOZILLA_VPN_SERVERS_KEY
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
  if (["StateInitialize", "StateAuthenticating"].includes(appState)) {
    return new StateVPNSignedOut();
  }

  if (appState === "StateSubscriptionNeeded") {
    return new StateVPNSubscriptionNeeded();
  }

  //
  const controllerState = status.vpn;
  const connectedSince = (() => {
    if (!status.connectedSince) {
      return 0;
    }
    return parseInt(status.connectedSince);
  })();
  const exit_city_name = status.location["exit_city_name"];
  const exit_country_code = status.location["exit_country_code"];
  const exitServerCountry = serverList.find(
    (country) => country.code === exit_country_code
  );
  const exitServerCity = exitServerCountry?.cities.find(
    (city) => city.name === exit_city_name
  );

  if (controllerState === "StateOn") {
    return new StateVPNEnabled(
      exitServerCity,
      exitServerCountry,
      status.localProxy?.url,
      connectedSince,
      status.connectionHealth
    );
  }
  if (controllerState === "StateOnPartial") {
    return new StateVPNOnPartial(
      exitServerCity,
      exitServerCountry,
      status.localProxy?.url,
      connectedSince
    );
  }
  if (
    controllerState === "StateOff" ||
    controllerState === "StateDisconnecting"
  ) {
    return new StateVPNDisabled(exitServerCity, exitServerCountry);
  }
  return;
}

export class FeatureFlags {
  localProxy = true;
  webExtension = true;
}
