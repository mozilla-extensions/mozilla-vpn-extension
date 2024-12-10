/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

import { Component } from "../component.js";
import { VPNController, VPNState } from "../vpncontroller/index.js";
import { fromStorage, putIntoStorage } from "../vpncontroller/vpncontroller.js";
import { property } from "../../shared/property.js";
import { PropertyType } from "../../shared/ipc.js";
import {
  FirefoxVPNState,
  StateFirefoxVPNIdle,
  StateFirefoxVPNDisabled,
  StateFirefoxVPNEnabled,
  StateFirefoxVPNConnecting,
  isEquatable,
} from "./states.js";

const ONBOARDING_KEY = "mozillaVpnOnboarding";

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
    nextOnboardingPage: PropertyType.Function,
    finishOnboarding: PropertyType.Function,
    currentOnboardingPage: PropertyType.Bindable
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
    this.#mState.value = new StateFirefoxVPNIdle();
    this.vpnController.state.subscribe(
      this.handleClientStateChanges.bind(this)
    );
  }

  /** @type {VPNState} */
  clientState;

  async init() {
    this.#mCurrentOnboardingPage.value = await fromStorage(
      browser.storage.local,
      ONBOARDING_KEY,
      1
    );
  }

  toggleConnectivity() {
    if (this.#mState.value.enabled) {
      // We are turning off the extension

      if (this.clientState.state == "OnPartial") {
        // Send deactivation to client and wait for response
        this.mKeepAliveConnection = false;
        this.vpnController.postToApp("deactivate");
        return;
      }

      return this.#mState.set(new StateFirefoxVPNDisabled(true));
    }
    this.mKeepAliveConnection = true;

    // We are turning the extension on...
    if (this.clientState.state == "Enabled") {
      // Client is already enabled
      this.#mState.set(new StateFirefoxVPNEnabled(false, Date.now()));
      return;
    }

    this.#mState.set(new StateFirefoxVPNConnecting());
    // Send activation to client and wait for response
    this.vpnController.postToApp("activate");
  }

  get state() {
    return this.#mState.readOnly;
  }

  get currentOnboardingPage() {
    return this.#mCurrentOnboardingPage.readOnly; // true w/ or w/o readonly
  }

  nextOnboardingPage() {
    this.#mCurrentOnboardingPage.set(this.#mCurrentOnboardingPage.value + 1);
  }

  finishOnboarding() {
    this.#mCurrentOnboardingPage.set(4);
    putIntoStorage(
      4,
      browser.storage.local,
      ONBOARDING_KEY
    );
  }

  /**
   *
   * @param {VPNState} newClientState
   * @returns {Promise<Void>}
   */
  async handleClientStateChanges(newClientState) {
    const currentExtState = this.#mState.value;
    this.clientState = newClientState;

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
      this.#mState.set(s);
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
        this.mKeepAliveConnection = true;
        maybeSet(new StateFirefoxVPNEnabled(false, getTime()));
        return;
      case "Disabled":
        if (this.mKeepAliveConnection) {
          this.vpnController.postToApp("activate");
          return;
        }
        this.#mState.set(new StateFirefoxVPNDisabled(false));
        return;
      case "OnPartial":
        maybeSet(new StateFirefoxVPNEnabled(true, getTime()));
        return;
      default:
        maybeSet(new StateFirefoxVPNIdle());
    }
  }

  #mState = property(new FirefoxVPNState());
  #mCurrentOnboardingPage = property(1);
  mKeepAliveConnection = false;
}
