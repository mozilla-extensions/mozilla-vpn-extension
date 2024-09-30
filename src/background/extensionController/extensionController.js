/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

import { Component } from "../component.js";
import { VPNController, VPNState } from "../vpncontroller/index.js";
import { property } from "../../shared/property.js";
import { PropertyType } from "../../shared/ipc.js";
import {
  FirefoxVPNState,
  StateFirefoxVPNIdle,
  StateFirefoxVPNDisabled,
  StateFirefoxVPNEnabled,
  StateFirefoxVPNConnecting,
} from "./states.js";

/**
 *
 * ExtensionController manages extension state and
 * provides a method to the popup for disabling and enabling
 * the "Firefox VPN".
 */
export class ExtensionController extends Component {
  static properties = {
    state: PropertyType.Bindable,
    toggleConnectivity: PropertyType.Function,
  };

  /**
   *
   * @param {*} receiver
   * @param {VPNController} vpnController
   */
  constructor(receiver, vpnController) {
    super(receiver);
    this.vpnController = vpnController;
    /** @type {FirefoxVPNState} */
    this.#mState.value = new StateFirefoxVPNIdle();
    this.vpnController.state.subscribe(
      this.handleClientStateChanges.bind(this)
    );
  }

  /** @type {VPNState} */
  clientState;

  async init() {}

  toggleConnectivity() {
    if (this.#mState.value.enabled) {
      // We are turning off the extension

      if (this.clientState.state == "OnPartial") {
        // Send deactivation to client and wait for response
        this.vpnController.postToApp("deactivate");
        return;
      }

      return this.#mState.set(new StateFirefoxVPNDisabled(true));
    }

    // We are turning the extension on...
    if (this.clientState.state == "Enabled") {
      // Client is already enabled
      this.#mState.set(new StateFirefoxVPNEnabled(false));
      return;
    }

    this.#mState.set(new StateFirefoxVPNConnecting());
    // Send activation to client and wait for response
    this.vpnController.postToApp("activate");
  }

  get state() {
    return this.#mState.readOnly;
  }

  /**
   *
   * @param {VPNState} newClientState
   * @returns {Promise<Void>}
   */
  async handleClientStateChanges(newClientState) {
    const currentExtState = this.#mState.value;
    this.clientState = newClientState;

    switch (newClientState.state) {
      case "Enabled":
        if (!currentExtState.bypassTunnel) {
          this.#mState.set(new StateFirefoxVPNEnabled(false));
        }
        break;

      case "Disabled":
        this.#mState.set(new StateFirefoxVPNDisabled(false));
        break;

      case "OnPartial":
        this.#mState.set(new StateFirefoxVPNEnabled(true));
        break;

      default:
        this.#mState.set(new StateFirefoxVPNIdle());
    }
    return;
  }

  #mState = property(new FirefoxVPNState());
}
