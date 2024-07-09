/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import  {Utils } from "./utils.js";


const log = Logger.logger("UI");
let self;

/**
 * Here we have a WIP UIHandler class which collectes and
 * provides various bits of state needed by the UI to show
 * the origin of the current active tab and any
 * associated context (proxy info) if it exists.
 */
export class TabHandler extends Component {
  #currentPort;
  #currentHostname;
  #servers
  #siteContexts
  #currentContext

  constructor(receiver) {
    super(receiver);
    self = this;
  }

  async init() {
    log("Initializing UIHandler");

    browser.tabs.onUpdated.addListener((tabId) => this.maybeShowIcon(tabId)); 
    browser.tabs.onActivated.addListener((activeInfo) => this.handleActiveTabChange(activeInfo));
    
    browser.runtime.onConnect.addListener(async port => {
      log(`Connecting to ${port.name}`);
      await this.popupConnected(port);
    });
    const mozillaVpnServers = await Utils.getServers();
    this.#servers = mozillaVpnServers;

    const {siteContexts} = await Utils.getSiteContexts();
    this.#siteContexts = siteContexts;
  }

  async handleActiveTabChange(activeInfo) {
    return await this.maybeShowIcon(activeInfo.id);
  }

  async handleEvent(type, data) {
    if (type === "site-contexts-updated") {

      const {siteContexts}  = await Utils.getSiteContexts();
      this.#siteContexts = siteContexts;
      this.#currentContext = await Utils.getContextForOrigin(this.#currentHostname);

      return await this.sendDataToCurrentPopup();
    }
  }

  async maybeShowIcon(tabId) {
    const currentTab = await Utils.getCurrentTab();

    this.#currentHostname = await Utils.getFormattedHostname(currentTab.url);
    this.#currentContext = await Utils.getContextForOrigin(this.#currentHostname);

    // if (this.#currentContext) {
      // TODO replace with flags
      browser.pageAction.setIcon({
        path: "../assets/logos/logo-light.svg",
        tabId
      });
      browser.pageAction.show(tabId);
    // }
    return;
  }

  async popupConnected(port) {
    log(`Popup connected. Current port: ${port.name}`);

    this.#currentPort = port;

    // Let's send the initial data.
    port.onMessage.addListener(async message => {
      log(`Message received from the popup: ${message}`);
      this.sendMessage(message.type, message.data);
    });

    port.onDisconnect.addListener(() => {
      log(`Disconnecting from ${port.name}`);
      this.#currentPort = null;
    });
  
    return await this.sendDataToCurrentPopup();
  }
  
  async sendDataToCurrentPopup() {
    const {siteContexts} = await Utils.getSiteContexts();
    this.#siteContexts =siteContexts


    this.#servers = await Utils.getServers();

    return self.#currentPort.postMessage({
      type: 'tabInfo',
      currentHostname: this.#currentHostname,
      siteContexts: this.#siteContexts,
      servers: this.#servers,
      currentContext: this.#currentContext
    });
  }
}
