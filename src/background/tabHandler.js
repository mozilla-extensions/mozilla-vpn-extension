/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "./utils.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";


const log = Logger.logger("UI");

/**
 * Here we have a WIP UIHandler class which collectes and
 * provides various bits of state needed by the UI to show
 * the origin of the current active tab and any
 * associated context (proxy info) if it exists.
 */
export class TabHandler extends Component {
  #currentPort;
  #currentHostname;
  #siteContexts
  #currentContext

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
    log("Initializing TabHandler");

    this.controller.state.subscribe(s => {
      this.controllerState = s;
      this.maybeShowIcon();
    });

    browser.tabs.onUpdated.addListener((tabId) => this.maybeShowIcon(tabId)); 
    browser.tabs.onActivated.addListener((activeInfo) => this.handleActiveTabChange(activeInfo));
    
    browser.runtime.onConnect.addListener(async port => {
      log(`Connecting to ${port.name}`);
      await this.popupConnected(port);
    });
    const {siteContexts} = await Utils.getSiteContexts();
    this.#siteContexts = siteContexts;

    this.maybeShowIcon();
  }

  async handleActiveTabChange(activeInfo) {
    return await this.maybeShowIcon(activeInfo.id);
  }

  async handleEvent(type, data) {
    if (type === "state-changed") {
      this.handleStateChange();
    }
    if (type === "site-contexts-updated") {

      const {siteContexts}  = await Utils.getSiteContexts();
      this.#siteContexts = siteContexts;
      this.#currentContext = Utils.getContextForOrigin(this.#currentHostname, siteContexts);

      return await this.sendDataToCurrentPopup();
    }
  }

  async maybeShowIcon() {
    const currentTab = await Utils.getCurrentTab();

    this.#currentHostname = await Utils.getFormattedHostname(currentTab.url);
    this.#currentContext = Utils.getContextForOrigin(this.#currentHostname, this.#siteContexts);

    if (this.controllerState.state === "Enabled") {
      // TODO replace with flags
      browser.pageAction.setIcon({
        path: "../assets/logos/logo-light.svg",
        tabId: currentTab.id
      });
      return browser.pageAction.show(currentTab.id);
    }
    return browser.pageAction.hide(currentTab.id);
  }

  async popupConnected(port) {
    log(`Popup connected. Current port: ${port.name}`);

    this.#currentPort = port;

    port.onMessage.addListener(async message => {
      log(`Message received from the popup: ${message.type}`);
      this.sendMessage(message.type, message.data);
    });

    port.onDisconnect.addListener(() => {
      log(`Disconnecting from ${port.name}`);
      this.#currentPort = null;
    });
  
    return await this.sendDataToCurrentPopup();
  }
  
  async sendDataToCurrentPopup() {
    return this.#currentPort.postMessage({
      type: 'tabInfo',
      currentHostname: this.#currentHostname,
      siteContexts: this.#siteContexts,
      servers: this.controllerState.servers,
      currentContext: this.#currentContext
    });
  }
}
