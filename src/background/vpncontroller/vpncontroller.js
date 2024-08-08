/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { Component } from "../component.js";
import { Logger } from "../logger.js";

import { property } from "../../shared/property.js";
import { PropertyType } from "../../shared/ipc.js";

import {
  VPNState,
  StateVPNEnabled,
  StateVPNUnavailable,
  StateVPNDisabled,
  REQUEST_TYPES,
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
    state: PropertyType.Bindable,
    postToApp: PropertyType.Function,
    isolationKey: PropertyType.Value,
  };

  get state() {
    return this.#mState.readOnly;
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
        this.#mState.value = new StateVPNUnavailable(this.#mState.value);
      });
    } catch (e) {
      log(e);
      this.#mState.value = new StateVPNUnavailable(this.#mState.value);
    }
  }

  async init() {
    this.#mState.value = await VPNState.fromStorage();
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
        this.#mState.value = new StateVPNUnavailable(this.#mState.value);
      }
    }
  }

  // Handle responses from MozillaVPN client
  async handleResponse(response) {
    if (!response.t) {
      // The VPN Client always sends a ".t : string"
      // to determing the message type.
      // If it's not there it's from the bridge.
      this.handleBridgeResponse(response);
      return;
    }
    switch (response.t) {
      case "servers":
        // @ts-ignore
        const newState = new this.#mState.value.constructor({
          ...this.#mState.value,
          servers: response.servers.countries,
        });
        VPNState.putIntoStorage(newState);
        this.#mState.value = newState;
        break;
      case "disabled_apps":
        // Todo: THIS IS HACKY
        // We need to find out if the excluded firefox
        const app_paths = [
          ["Firefox Nightly", "firefox.exe"],
          ["Firefox", "firefox.exe"],
          ["Firefox Developer Edition", "firefox.exe"],
        ];
        const intersects = (a, b) => {
          return a.filter(Set.prototype.has, new Set(b)).length == 0;
        };

        let apps = response["disabled_apps"];
        apps ??= [];
        const isFirefoxExcluded = apps.some((path) => {
          const path_components = path.split("[\\/]"); // Split \\ and /
          return app_paths.some((searchPath) => {
            return intersects(path_components, searchPath);
          });
        });
        if (isFirefoxExcluded) {
          this.#mState.value =
            // @ts-ignore
            new this.#mState.value.constructor({
              ...this.#mState,
              isExcluded: true,
            });
          return;
        }
        break;
      case "status":
        const status = response.status;
        const controllerState = status.vpn;
        const connectedSince = (() => {
          if (!status.connectedSince) {
            return 0;
          }
          return parseInt(status.connectedSince);
        })();
        const exit_city_name = status.location["exit_city_name"];
        const exit_country_code = status.location["exit_country_code"];
        const exitServerCountry = this.#mState.value.servers.find(
          (country) => country.code === exit_country_code
        );
        const exitServerCity = exitServerCountry?.cities.find(
          (city) => city.name === exit_city_name
        );

        const next_state = {
          ...this.#mState.value,
          exitServerCity,
          exitServerCountry,
        };

        if (controllerState === "StateOn") {
          this.#mState.value = new StateVPNEnabled(
            next_state,
            status.localProxy?.url,
            connectedSince
          );
          return;
        }
        if (
          controllerState === "StateOff" ||
          controllerState === "StateDisconnecting"
        ) {
          this.#mState.value = new StateVPNDisabled(next_state);
          return;
        }
        // Let's increase the network key isolation at any vpn status change.
        this.#increaseIsolationKey();
        break;
      default:
        throw Error("Unexpeted Message type: " + response.t);
    }
  }

  // Called in case we get the message directly from
  // the native messaging bridge, not the client
  async handleBridgeResponse(response) {
    // We can only get 2 types of messages right now: client-down/up
    if (response.status && response.status === "vpn-client-down") {
      if (this.#mState.value.alive) {
        this.#mState.value = new StateVPNUnavailable(this.#mState.value);
      }
      return;
    }
    // The VPN Just started && connected to Native Messaging
    if (response.status && response.status === "vpn-client-up") {
      queueMicrotask(() => {
        this.postToApp("status");
        this.postToApp("servers");
        this.postToApp("disabled_apps");
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
   * @type {number}
   */
  get isolationKey() {
    return this.#isolationKey;
  }

  #increaseIsolationKey() {
    ++this.#isolationKey;
  }

  /** @type {browser.runtime.Port?} */
  #port = null;
  #isolationKey = 0;

  #mState = property(new VPNState(null));
}
