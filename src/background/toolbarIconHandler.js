/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Utils } from "../shared/utils.js";
import {
  ExtensionController,
  FirefoxVPNState,
} from "./extensionController/index.js";

const unstableColor = "#FFA436";
const onboardingColor = "#0060DF";
const disabledColor = "#E22850";
const enabledColor = "#3FE1B0";

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
    this.isSupportedPlatform = true;
    browser.runtime.getPlatformInfo().then((deviceOs) => {
      this.isSupportedPlatform = Utils.isSupportedOs(deviceOs.os);
      this.maybeUpdateBrowserActionIcon();
    });
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
    browser.theme.onUpdated.addListener(
      this.maybeUpdateBrowserActionIcon.bind(this)
    );
  }

  setIcon(backgroundColor, statusColor, id) {
    browser.browserAction.setIcon({
      path: {
        32: ToolbarIconHandler.toDataUrl(
          ToolbarIconHandler.getLogo(backgroundColor, statusColor)
        ),
      },
      windowId: id,
    });
  }

  static getLogo(vpnFillColor = "black", blobFillColor = "yellow") {
    return `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            fill="${vpnFillColor}"
            fill-rule="evenodd" 
            clip-rule="evenodd" 
            d="M6.79922 3.0002C6.79922 2.33745 7.33648 1.8002 7.99922 1.8002C8.66196 1.8002 9.19922 2.33745 9.19922 3.0002C9.19922 3.66294 8.66196 4.2002 7.99922 4.2002C7.33648 4.2002 6.79922 3.66294 6.79922 3.0002ZM7.99922 0.200195C6.45282 0.200195 5.19922 1.4538 5.19922 3.0002C5.19922 3.4824 5.32111 3.93614 5.53577 4.33227L4.33129 5.53674C3.93516 5.32209 3.48142 5.20019 2.99922 5.20019C1.45282 5.20019 0.199219 6.4538 0.199219 8.0002C0.199219 9.54659 1.45282 10.8002 2.99922 10.8002C4.26763 10.8002 5.33905 9.95679 5.68327 8.80019H9.59883C10.2176 8.33527 10.9757 8.04566 11.7992 8.00511C11.7992 8.00347 11.7992 8.00183 11.7992 8.0002C11.7992 7.33745 12.3365 6.8002 12.9992 6.8002C13.662 6.8002 14.1992 7.33745 14.1992 8.0002C14.1992 8.20597 14.1474 8.39965 14.0562 8.5689C14.5247 8.85039 14.9309 9.22513 15.2489 9.66745C15.5947 9.20168 15.7992 8.62483 15.7992 8.0002C15.7992 6.4538 14.5456 5.20019 12.9992 5.20019C11.7308 5.20019 10.6594 6.0436 10.3152 7.20019H5.68327C5.62785 7.01398 5.55357 6.83588 5.46267 6.66811L6.66714 5.46364C7.06327 5.6783 7.51701 5.8002 7.99922 5.8002C9.54562 5.8002 10.7992 4.54659 10.7992 3.0002C10.7992 1.4538 9.54562 0.200195 7.99922 0.200195ZM9.66648 15.2499C9.22415 14.9318 8.84941 14.5257 8.56792 14.0571C8.39867 14.1484 8.20499 14.2002 7.99922 14.2002C7.33648 14.2002 6.79922 13.6629 6.79922 13.0002C6.79922 12.3375 7.33648 11.8002 7.99922 11.8002C8.00086 11.8002 8.00249 11.8002 8.00413 11.8002C8.03178 11.2387 8.17524 10.7075 8.41111 10.2303C8.27669 10.2105 8.13915 10.2002 7.99922 10.2002C6.45282 10.2002 5.19922 11.4538 5.19922 13.0002C5.19922 14.5466 6.45282 15.8002 7.99922 15.8002C8.62385 15.8002 9.20071 15.5957 9.66648 15.2499ZM1.79922 8.0002C1.79922 7.33745 2.33648 6.8002 2.99922 6.8002C3.66196 6.8002 4.19922 7.33745 4.19922 8.0002C4.19922 8.66294 3.66196 9.2002 2.99922 9.2002C2.33648 9.2002 1.79922 8.66294 1.79922 8.0002Z"/>
          <rect fill="${blobFillColor}" 
                x="8.80078" y="8.7998" 
                width="6.4" height="6.4" 
                rx="3.2" />
        </svg>
    `;
  }
  static toDataUrl(logo) {
    const base64 = btoa(logo);
    return `data:image/svg+xml;base64,${base64}`;
  }
  static getFillColor(themeColors) {
    const darkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const defaultColor = darkMode ? "white" : "black";

    // If there is no theme selected in firefox, just use defaults
    if (!themeColors) {
      return defaultColor;
    }
    if (themeColors.icons) {
      // If the Theme specifically tells us the icon color to use
      // respect that.
      return themeColors.icons;
    }
    if (themeColors.toolbar_text) {
      return themeColors.toolbar_text;
    }
    // We failed to find a good color >:(
    return defaultColor;
  }

  async maybeUpdateBrowserActionIcon() {
    const windowInfo = await browser.windows.getCurrent();
    if (!windowInfo) {
      return;
    }
    const theme = await browser.theme.getCurrent();
    // tab_background_text seems to be the same as --toolbarbutton-icon-fill
    // which is sadly not exported int the theme >:/
    const iconFill = ToolbarIconHandler.getFillColor(theme.colors);

    if (!this.isSupportedPlatform) {
      return this.setIcon(iconFill, disabledColor, windowInfo.id);
    }
    if (!this.extState.state) {
      return;
    }

    let statusColor = ["Connecting", "Enabled"].includes(this.extState?.state)
      ? enabledColor
      : disabledColor;

    const stability = this.vpnState?.connectionHealth;

    if (!stability || stability == "Stable") {
      return this.setIcon(iconFill, statusColor, windowInfo.id);
    }

    statusColor = stability === "Unstable" ? unstableColor : disabledColor;

    return this.setIcon(iconFill, statusColor, windowInfo.id);
  }
}
