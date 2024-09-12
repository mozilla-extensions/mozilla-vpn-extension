/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

import { Component } from "../component.js";
import { VPNController } from "../vpncontroller/index.js";
import { property } from "../../shared/property.js";
import { PropertyType } from "../../shared/ipc.js";
import {
  FirefoxVPNState,
  StateFirefoxVPNIdle,
  StateFirefoxVPNDisabled,
  StateFirefoxVPNEnabled,
} from "./states.js";
import {
  ProxyRuleBypassTunnel,
  ProxyRuleDirect,
  ProxyRuleUseExitRelays,
  ProxyRules,
} from "../proxyHandler/proxyRules.js";

/**
 *
 * ExtensionController
 *
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
    this.#mState.value = new StateFirefoxVPNIdle();
    this.vpnController.state.subscribe(
      this.handleClientStateChanges.bind(this)
    );
  }

  clientState;

  async init() {}

  toggleConnectivity() {
    if (this.#mState.value.enabled) {
      // We are turning off the extension
      
      if (this.clientState.state == "OnPartial") {
        // Send deactivation to client and wait for response
        this.vpnController.postToApp("deactivate");
        return 
      }
      return this.#mState.set(
        new StateFirefoxVPNDisabled(new ProxyRuleBypassTunnel(this.clientState))
      );
    }
    
    // We are turning the extension on... 
    if (this.clientState.state == "Enabled") {
      // Client is already enabled
      this.#mState.set(new StateFirefoxVPNEnabled(new ProxyRuleDirect()));
      return;
    }

    // Send activation to client and wait for response
    this.vpnController.postToApp("activate");
  }

  get state() {
    return this.#mState.readOnly;
  }

  async handleClientStateChanges(newClientState) {
    const currentExtState = this.#mState.value;
    this.clientState = newClientState;

    switch (newClientState.state) {
      case "Enabled":
        if (currentExtState.proxyRule.type !== ProxyRules.BYPASS_TUNNEL) {
          this.#mState.set(new StateFirefoxVPNEnabled(new ProxyRuleDirect()));
        }
        break;

      case "Disabled":
        this.#mState.set(new StateFirefoxVPNDisabled(new ProxyRuleDirect()));
        break;

      case "OnPartial":
        this.#mState.set(
          new StateFirefoxVPNEnabled(new ProxyRuleUseExitRelays(newClientState))
        );
        break;

      default:
        this.#mState.set(new StateFirefoxVPNIdle());
    }
    return;
  }

  #mState = property(new FirefoxVPNState());
}
