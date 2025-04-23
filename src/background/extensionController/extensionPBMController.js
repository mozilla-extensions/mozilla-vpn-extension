/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { VPNController, VPNState } from "../vpncontroller/index.js";
import { PropertyType } from "../../shared/ipc.js";

import { property } from "../../shared/property.js";

import { ExtensionController } from "./extensionController.js";

/**
 *
 * ExtensionController manages extension state and
 * provides a method to the popup for disabling and enabling
 * the "Firefox VPN".
 */
export class ExtensionPBMController extends ExtensionController {
  static properties = {
    ...super.properties,
    toggleAutoConnect: PropertyType.Function,
    autoConnect: PropertyType.Bindable,
  };
  /**
   *
   * @param {*} receiver
   * @param {VPNController} vpnController
   * @param {ExtensionController} parentExtController
   */
  constructor(receiver, vpnController, parentExtController) {
    super(receiver, vpnController);
    this.parentExtController = parentExtController;
  }

  async init() {
    await super.init();

    const { autstartOnPBM } = await browser.storage.local.get("autstartOnPBM");
    this.autoConnect.value = autstartOnPBM || false;

    this.autoConnect.subscribe((newValue) => {
      browser.storage.local.set({ autstartOnPBM: newValue });
    });

    browser.windows.onCreated.addListener((window) => {
      if (!window.incognito) {
        return;
      }
      // If we currently don't have a private browsing mode session, copy over
      // the current state.
      if (this.privateWindowIds.size == 0) {
        this.mState.value = this.parentExtController.state.value;
      }
      // In case autoconnect is on, trigger a connection, if we arent't connected.
      if (this.autoConnect.value === true && !this.mState.value.enabled) {
        this.toggleConnectivity();
      }
      // Keep the id, so we have a count of active private window sessions.
      this.privateWindowIds.add(window.id);
    });
    browser.windows.onRemoved.addListener((windowID) => {
      if (this.privateWindowIds.has(windowID)) {
        this.privateWindowIds.delete(windowID);
      }
    });
  }

  toggleAutoConnect() {
    this.autoConnect.value = !this.autoConnect.value;
  }

  parentExtController;
  privateWindowIds = new Set();
  autoConnect = property(false);
}
