/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "../shared/utils.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";
import { PropertyType } from "../shared/ipc.js";

const log = Logger.logger("TabHandler");

/**
 * Here we have a WIP UIHandler class which collectes and
 * provides various bits of state needed by the UI to show
 * the origin of the current active tab and any
 * associated context (proxy info) if it exists.
 */
export class TabHandler extends Component {
  // Things to expose to the UI
  static properties = {
    popupData: PropertyType.Function,
  };

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
    this.controller.state.subscribe((s) => {
      this.controllerState = s;
      this.maybeShowIcon();
      if (this.currentPort && this.currentPort.name === "pageAction") {
        this.sendDataToCurrentPopup();
      }
    });

    this.proxyHandler.siteContexts.subscribe((siteContexts) => {
      this.siteContexts = siteContexts;
      this.maybeShowIcon();
    });

    browser.tabs.onUpdated.addListener(() => this.maybeShowIcon());
    browser.tabs.onActivated.addListener(() => this.maybeShowIcon());
    this.maybeShowIcon();
  }

  async maybeShowIcon() {
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
        path: `../assets/flags/${this.currentContext.countryCode.toUpperCase()}.png`,
        tabId: currentTab.id,
      });
      return browser.pageAction.show(currentTab.id);
    }

    return browser.pageAction.hide(currentTab.id);
  }

  popupData() {
    return {
      type: "tabInfo",
      currentHostname: this.currentHostname,
      siteContexts: this.siteContexts,
      servers: this.controllerState.servers,
      currentContext: this.currentContext,
    };
  }
}
