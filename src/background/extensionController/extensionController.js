/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

import { Component } from "../component.js";
import { VPNController, VPNState } from "../vpncontroller/index.js";
import { property, computed } from "../../shared/property.js";
import { PropertyType } from "../../shared/ipc.js";
import {
  FirefoxVPNState,
  StateFirefoxVPNIdle,
  StateFirefoxVPNDisabled,
  StateFirefoxVPNEnabled,
  StateFirefoxVPNConnecting,
  isEquatable,
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
    allowDisconnect: PropertyType.Bindable,
  };

  /**
   *
   * @param {*} receiver
   * @param {VPNController} vpnController
   */
  constructor(receiver, vpnController) {
    super(receiver);
    this.vpnController = vpnController;
    this.clientState = vpnController.state.value;
    /** @type {FirefoxVPNState} */
    this.mState.value = new StateFirefoxVPNIdle();
  }

  /** @type {VPNState} */
  clientState;

  async init() {
    // First await the inital state.
    this.mState.value = await ExtensionController.getInitalState(
      this.vpnController.state
    );
    // After that subscribe to any changes
    this.vpnController.state.subscribe(
      this.handleClientStateChanges.bind(this)
    );
  }

  async toggleConnectivity() {
    if (
      this.mState.value.state === "Connecting" &&
      this.clientState.state === "Disabled"
    ) {
      // We're aborting an activation
      this.vpnController.postToApp("deactivate");
      this.mKeepAliveConnection = false;
      this.mState.set(new StateFirefoxVPNDisabled(true));
      return;
    }
    if (this.mState.value.enabled) {
      // We are turning off the extension
      // Todo:
      // Let's for now *NOT* deactivate the client:
      // We cannot guarantee that there aren't any other profiles or
      // instances of firefox rely on the connection.
      // If we deactivate, they will re-activate and then just create
      // work that is uneeded.
      // this.vpnController.postToApp("deactivate");
      this.mState.set(new StateFirefoxVPNDisabled(true));
      return;
    }
    // In any case the user wants to activate.
    // Enable the keep-alive, so a switch from the vpn client on-> off
    // will cause a re-activation.
    this.mKeepAliveConnection = true;

    if (this.clientState.state == "Enabled") {
      // Client is already in "full device protection mode"
      // We can enable without using the endpoint proxies.
      this.mState.set(new StateFirefoxVPNEnabled(false, Date.now()));
      return;
    }
    if (this.clientState.state == "OnPartial") {
      // Client is in "partial device protection mode"
      // Very likely due to another profile, or pbm.
      // We can enable using the endpoint proxies.
      this.mState.set(new StateFirefoxVPNEnabled(true, Date.now()));
      return;
    }
    this.mState.set(new StateFirefoxVPNConnecting());

    this.#mAllowDisconnect.value = false;
    setTimeout(() => {
      this.#mAllowDisconnect.value = true;
    }, 10000);

    // Send activation to client and wait for response
    this.vpnController.postToApp("activate");
    this.mState.value = await new Promise((res) => {
      const unsub = this.vpnController.state.subscribe((newstate) => {
        let done = (v) => {
          unsub(), res(v);
        };
        switch (newstate.state) {
          case "Enabled":
            done(new StateFirefoxVPNEnabled(false, Date.now()));
          case "Disabled":
            done(new StateFirefoxVPNDisabled(false));
          case "OnPartial":
            done(new StateFirefoxVPNEnabled(true, Date.now()));
        }
      });
    });
  }

  get state() {
    return this.mState.readOnly;
  }

  get allowDisconnect() {
    return this.#mAllowDisconnect.readOnly;
  }

  /**
   *
   * @param {VPNState} newClientState
   * @returns {Promise<Void>}
   */
  async handleClientStateChanges(newClientState) {
    const currentExtState = this.mState.value;
    this.clientState = newClientState;
    if (currentExtState.connecting) {
      return;
    }
    const maybeSet = (s = new FirefoxVPNState()) => {
      // Prevent client status updates from re-enabling the extension VPN when
      // it has been turned off via the popup
      if (
        this.clientState.state == "Enabled" &&
        currentExtState.state == "Disabled" &&
        currentExtState.bypassTunnel
      ) {
        return;
      }

      // Check if it is a meaningful change, otherwise don't propagate
      // a statechange.
      if (isEquatable(s, currentExtState)) {
        return;
      }
      this.mState.set(s);
    };
    const getTime = () => {
      // If we switch between partial <-> enabled - we need to re-use the timestamp.
      if (currentExtState.enabled) {
        return currentExtState.connectedSince;
      }
      return Date.now();
    };

    switch (newClientState.state) {
      case "Enabled":
        maybeSet(new StateFirefoxVPNEnabled(false, getTime()));
        return;
      case "Disabled":
        if (this.mKeepAliveConnection) {
          this.vpnController.postToApp("activate");
          return;
        }
        this.mState.set(new StateFirefoxVPNDisabled(false));
        return;
      case "OnPartial":
        if (currentExtState.enabled) {
          maybeSet(new StateFirefoxVPNEnabled(true, getTime()));
        } else {
          this.mState.set(new StateFirefoxVPNDisabled(false));
        }
        return;
      default:
        maybeSet(new StateFirefoxVPNIdle());
    }
  }

  /**
   * gets the initial state the Extension should be in
   * should only be called once.
   */
  static async getInitalState(stateReadable) {
    return computed(stateReadable, (a) => {
      /** @type {VPNState} */
      const vpnState = a;
      switch (vpnState.state) {
        case "Enabled":
          return new StateFirefoxVPNEnabled(false, Date.now());
        case "Disabled":
          return new StateFirefoxVPNDisabled(false);
        case "OnPartial":
          return new StateFirefoxVPNDisabled(false);
      }
      return null;
    }).waitForFirstValue();
  }

  mState = property(new FirefoxVPNState());
  #mAllowDisconnect = property(false);
  mKeepAliveConnection = false;
}
