/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "./utils.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";

const log = Logger.logger("RequestHandler");
let self;
/**
 * RequestHandler is responsible for intercepting, inspecting,
 * and determining whether a Request should be proxied.
 */
export class RequestHandler extends Component {
  #siteContexts;
  /**
   *
   * @param {*} receiver
   * @param {VPNController} controller
   */
  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
    self=this;
  }

  /** @type {VPNState | undefined} */
  controllerState;

  async init() {
    log("Initiating RequestHandler");
    const { siteContexts } = await Utils.getSiteContexts();
    this.#siteContexts = siteContexts;

    this.controller.state.subscribe(s => {
      this.controllerState = s;
      this.addOrRemoveRequestListener();
    });
  }

  addRequestListener() {
    log("Adding request listener");

    browser.proxy.onRequest.addListener(
      this.interceptRequests,
      { urls: ['<all_urls>'] }
    );
  }

  async addOrRemoveRequestListener() {
    const { siteContexts } = await Utils.getSiteContexts();
    const s = this.controllerState.state;
    if (siteContexts.size === 0) {
      return this.removeRequestListener();
    }

    switch(s) {
      case "Enabled":
        this.addRequestListener();
        break;
      case "Disabled": 
        this.removeRequestListener();
        break;
      case "Unavailable":
        this.removeRequestListener();
        break;
    }
  }

  async handleEvent(type, data=null) {
    switch(type) {
      case "site-contexts-updated":
        const { siteContexts } = await Utils.getSiteContexts();
        self.#siteContexts = siteContexts;
        this.addOrRemoveRequestListener();
    }
  }

  /**
   *
   * @param { RequestDetails } requestInfo
   * @returns
   */
  async interceptRequests(requestInfo) {
    let { url, originUrl } = requestInfo;

    for (let urlString of [url, originUrl]) {
      if (urlString) {
        const parsedHostname = await Utils.getFormattedHostname(urlString);
        const siteContext = await Utils.getContextForOrigin(parsedHostname, self.#siteContexts);

        if (siteContext) {
          return [siteContext.proxyInfo];
        }
      }
    }

    // No custom proxy for the site, return direct connection
    return { direct: true };
  }

  removeRequestListener() {
    log("Removing request listener");
    return browser.proxy.onRequest.removeListener(this.interceptRequests);
  }
}