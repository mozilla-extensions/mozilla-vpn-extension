/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "../shared/utils.js";
import { PropertyType } from "../shared/ipc.js";
import {
  ExtensionController,
  FirefoxVPNState,
} from "./extensionController/index.js";
import { ProxyHandler } from "./proxyHandler/index.js";
import { VPNController } from "./vpncontroller/vpncontroller.js";

import { tr } from "../../shared/i18n.js";

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
   * @param {ExtensionController} extController
   * @param {ProxyHandler} proxyHandler
   * @param {VPNController} vpnController
   */
  constructor(receiver, extController, proxyHandler, vpnController) {
    super(receiver);
    this.extController = extController;
    this.proxyHandler = proxyHandler;
    this.vpnController = vpnController;
  }

  /** @type {FirefoxVPNState | undefined} */
  extState;

  siteContexts;
  currentHostname;
  currentContext;
  servers;

  async init() {
    log("Initializing TabHandler");
    this.vpnController.servers.subscribe((s) => {
      this.servers = s;
      console.log("servers", s);
    });

    this.extController.state.subscribe((s) => {
      this.extState = s;
      this.maybeShowIcon();
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
    if (!this.siteContexts) {
      return;
    }
    const currentTab = await Utils.getCurrentTab();
    if (!currentTab) {
      return;
    }
    if (this.extState.state !== "Enabled") {
      return browser.pageAction.hide(currentTab.id);
    }

    this.currentHostname = await Utils.getDomainName(currentTab.url);
    this.currentContext = this.siteContexts.get(this.currentHostname);

    if (this.currentContext && this.currentContext.excluded) {
      // PageAction icons are automagically updated by the
      // browser in response to theme changes so we don't
      // don't need to specify theme specific icons here.
      browser.pageAction.setIcon({
        path: `../assets/logos/logo-dark-excluded.svg`,
        tabId: currentTab.id,
      });
      browser.pageAction.setTitle({
        tabId: currentTab.id,
        title: tr("offForWebsite"),
      });
      return browser.pageAction.show(currentTab.id);
    }

    if (this.currentContext && this.currentContext.countryCode) {
      browser.pageAction.setIcon({
        path: `../assets/flags/${this.currentContext.countryCode.toUpperCase()}.png`,
        tabId: currentTab.id,
      });

      browser.pageAction.setTitle({
        tabId: currentTab.id,
        title: tr(
          "websiteLocationLabel",
          Utils.nameFor(
            this.currentContext.countryCode,
            this.currentContext.cityCode,
            this.servers
          )
        ),
      });
      return browser.pageAction.show(currentTab.id);
    }

    return browser.pageAction.hide(currentTab.id);
  }
}
