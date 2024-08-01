/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "./utils.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";

const log = Logger.logger("TabHandler");

/**
 * PageActionHandler watches for tab
 * changes, checks if the currentTab url is associated
 * with a siteContext and dynamically shows/hides the
 * appropriate icon. PageActionHandler also sends this
 * info to the pageActionPopup.
 */
export class PageActionHandler extends Component {
  currentPort;

  /**
   *
   * @param {*} receiver
   * @param {VPNController} controller
   */
  constructor(receiver, controller, proxyHandler) {
    super(receiver);
    this.controller = controller;
    this.proxyHandler = proxyHandler;
  }

  /** @type {VPNState | undefined} */
  controllerState;

  siteContexts;
  currentHostname;
  currentContext;

  async init() {
    log("Initializing TabHandler");

    // TODO use extension state instead of controller state
    this.controller.state.subscribe((s) => {
      this.controllerState = s;
      this.sendDataToPageActionPopup();
    });

    this.proxyHandler.siteContexts.subscribe((siteContexts) => {
      log("Subscribing to proxyHandler");
      this.siteContexts = siteContexts;
      this.maybeShowFlagIcon;
      this.sendDataToPageActionPopup();
    });

    browser.tabs.onUpdated.addListener(() => this.maybeShowFlagIcon());
    browser.tabs.onActivated.addListener(() => this.maybeShowFlagIcon());

    browser.runtime.onConnect.addListener(async (port) => {
      await this.portConnected(port);
    });

    this.maybeShowFlagIcon();
  }

  async maybeShowFlagIcon() {
    const currentTab = await Utils.getCurrentTab();
    if (this.controllerState.state !== "Enabled") {
      return browser.pageAction.hide(currentTab.id);
    }

    this.currentHostname = await Utils.getFormattedHostname(currentTab.url);
    this.currentContext = this.siteContexts.get(this.currentHostname);

    if (this.currentContext && this.currentContext.excluded) {
      // PageAction icons are automagically updated by the
      // browser in response to theme changes so we don't
      // don't need to specify theme specific icons here.
      browser.pageAction.setIcon({
        path: `../assets/logos/logo-dark-excluded.svg`,
        tabId: currentTab.id,
      });
      return browser.pageAction.show(currentTab.id);
    }

    if (this.currentContext && this.currentContext.countryCode) {
      browser.pageAction.setIcon({
        path: `../assets/flags/${this.currentContext.countryCode}.png`,
        tabId: currentTab.id,
      });
      return browser.pageAction.show(currentTab.id);
    }

    return browser.pageAction.hide(currentTab.id);
  }

  portConnected(port) {
    this.currentPort = port;

    port.onDisconnect.addListener(() => {
      this.currentPort = null;
    });

    if (port.name === "pageAction") {
      return this.sendDataToPageActionPopup();
    }
  }

  sendDataToPageActionPopup() {
    if (!this.currentPort || this.currentPort.name !== "pageAction") {
      return;
    }
    return this.currentPort.postMessage({
      type: "pageActionInfo",
      currentHostname: this.currentHostname,
      currentContext: this.currentContext,
    });
  }
}
