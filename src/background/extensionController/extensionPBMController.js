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
  /**
   *
   * @param {*} receiver
   * @param {VPNController} vpnController
   * @param {ExtensionController} parentExtController
   */
  constructor(receiver, vpnController, parentExtController) {
    super(receiver, vpnController);
    this.parentExtController = parentExtController;
    this.autoStartStorageKey = "autostartOnPBM";
  }

  async init() {
    const wasInitialized = super.init();

    // In case we got pbm-permission removed, clear the setting.
    if (!(await browser.extension.isAllowedIncognitoAccess())) {
      this.autoConnect.value = false;
    }

    browser.windows.onCreated.addListener(async (window) => {
      if (!window.incognito) {
        return;
      }
      // If we currently don't have a private browsing mode session, copy over
      // the current state.
      if (this.privateWindowIds.size == 0) {
        this.mState.value = this.parentExtController.state.value;
      }
      // Keep the id, so we have a count of active private window sessions.
      this.privateWindowIds.add(window.id);

      // In case autoconnect is off, or we're connected, all good.
      if (this.autoConnect.value === false || this.mState.value.enabled) {
        return;
      }
      await this.waitForVPN();
      await wasInitialized;
      // We started now, so all good.
      if (this.mState.value.enabled) {
        return;
      }
      this.toggleConnectivity();
    });
    browser.windows.onRemoved.addListener((windowID) => {
      if (this.privateWindowIds.has(windowID)) {
        this.privateWindowIds.delete(windowID);
      }
    });
    await wasInitialized;
  }

  async waitForVPN() {
    if (this.vpnController.state.value.alive) {
      return;
    }
    this.vpnController.postToApp("start", { minimized: true });
    for await (const state of this.vpnController.state) {
      if (state.alive) {
        return;
      }
    }
  }

  async shouldAutoConnect() {
    if (this.privateWindowIds.size == 0) {
      return false;
    }
    return this.autoConnect.value;
  }

  parentExtController;
  privateWindowIds = new Set();
}
