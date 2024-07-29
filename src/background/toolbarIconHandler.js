/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";

/**
 * ToolbarIconHandler updates the browserAction (toolbar) icon 
 * to reflect the VPN client's status and updates the icon in
 * response to darkmode/lightmode changes.
 */
export class ToolbarIconHandler extends Component {
  /**
   *
   * @param {*} receiver
   * @param {VPNController} controller
   */
  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
  }

  /** @type {VPNState | undefined} */
  controllerState;

  async init() {
    this.controller.state.subscribe((s) => {
      this.controllerState = s;
      this.maybeUpdateBrowserActionIcon();
    });

    // Listen for darkmode/lightmode changes and update the browserAction icon
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        this.maybeUpdateBrowserActionIcon();
      });
  }

  maybeUpdateBrowserActionIcon() {
    // TODO: Checkl onboarding status
    // and show icon with blue dot if
    // onboarding is not complete...

    const scheme =
      window.matchMedia &&
      !!window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "light"
        : "dark";
    
    browser.browserAction.setIcon({
      path: {
        16: `./../assets/logos/browserAction/logo-${scheme}-${this.controllerState.state.toLowerCase()}.svg`,
        32: `./../assets/logos/browserAction/logo-${scheme}-${this.controllerState.state.toLowerCase()}.svg`,
      },
    });
  }
}
