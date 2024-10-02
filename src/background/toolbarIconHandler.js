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
  constructor(receiver, extController, vpnController) {
    super(receiver);
    this.extController = extController;
    this.vpnController = vpnController;
  }

  /** @type {FirefoxVPNState | undefined} */
  extState;

  vpnState;

  async init() {
    this.extController.state.subscribe((s) => {
      this.extState = s;
      this.maybeUpdateBrowserActionIcon();
    });

    this.vpnController.state.subscribe((s) => {
      this.vpnState = s;
      this.maybeUpdateBrowserActionIcon();
    });

    // Listen for darkmode/lightmode changes and update the browserAction icon
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        this.maybeUpdateBrowserActionIcon();
      });

    // Catch changes between private and non-private browsing windows
    browser.windows.onFocusChanged.addListener(
      this.maybeUpdateBrowserActionIcon.bind(this)
    );

    // Catch changes between private and non-private browsing modes
    // when a new window is opened.
    browser.windows.onCreated.addListener(
      this.maybeUpdateBrowserActionIcon.bind(this)
    );
  }

  setIcon(scheme, status, id) {
    browser.browserAction.setIcon({
      path: {
        16: `./../assets/logos/browserAction/logo-${scheme}-${status}.svg`,
        32: `./../assets/logos/browserAction/logo-${scheme}-${status}.svg`,
      },
      windowId: id,
    });
  }

  async maybeUpdateBrowserActionIcon() {
    const windowInfo = await browser.windows.getCurrent();
    if (!windowInfo) {
      return;
    }

    const darkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const scheme = darkMode || windowInfo.incognito ? "light" : "dark";

    let status = ["Connecting", "Enabled"].includes(this.extState.state)
      ? "enabled"
      : "disabled";

    const stability = this.vpnState?.connectionHealth;

    if (!stability || stability == "Stable") {
      return this.setIcon(scheme, status, windowInfo.id);
    }

    status = stability === "Unstable" ? "unstable" : "disabled";

    return this.setIcon(scheme, status, windowInfo.id);
  }
}
