/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import {
  ExtensionController,
  FirefoxVPNState,
} from "./extensionController/index.js";

/**
 * ToolbarIconHandler updates the browserAction (toolbar) icon
 * to reflect the VPN client's status and updates the icon in
 * response to darkmode/lightmode changes.
 */
export class ToolbarIconHandler extends Component {
  /**
   *
   * @param {*} receiver
   * @param {ExtensionController} extController
   */
  constructor(receiver, extController) {
    super(receiver);
    this.extController = extController;
  }

  /** @type {FirefoxVPNState | undefined} */
  extState;

  async init() {
    this.extController.state.subscribe((s) => {
      this.extState = s;
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
    const scheme =
      window.matchMedia &&
      !!window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "light"
        : "dark";

    const status = ["Connecting", "Enabled"].includes(this.extState.state)
      ? "enabled"
      : "disabled";

    browser.browserAction.setIcon({
      path: {
        16: `./../assets/logos/browserAction/logo-${scheme}-${status}.svg`,
        32: `./../assets/logos/browserAction/logo-${scheme}-${status}.svg`,
      },
    });
  }
}
