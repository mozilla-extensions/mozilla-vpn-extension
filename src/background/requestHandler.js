/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "../shared/utils.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";

const log = Logger.logger("RequestHandler");
let self;
/**
 * RequestHandler is responsible for intercepting, inspecting,
 * and determining whether a Request should be proxied.
 */
export class RequestHandler extends Component {
  /**
   *
   * @param {*} receiver
   * @param {VPNController} controller
   */
  constructor(receiver, controller, proxyHandler) {
    super(receiver);
    this.controller = controller;
    this.proxyHandler = proxyHandler;
    self = this;
  }

  /** @type {VPNState | undefined} */
  controllerState;
  siteContexts;

  async init() {
    log("Initiating RequestHandler");

    this.controller.state.subscribe((s) => {
      this.controllerState = s;
      this.addOrRemoveRequestListener();
    });

    this.proxyHandler.siteContexts.subscribe((siteContexts) => {
      this.siteContexts = siteContexts;
      if (this.siteContexts.size === 0) {
        return this.removeRequestListener();
      }
      return this.addOrRemoveRequestListener();
    });
  }

  addRequestListener() {
    log("Adding request listener");

    browser.proxy.onRequest.addListener(this.interceptRequests, {
      urls: ["<all_urls>"],
    });
  }

  async addOrRemoveRequestListener() {
    const s = this.controllerState.state;

    switch (s) {
      case "Enabled":
        this.addRequestListener();
        break;
      case "Disabled":
        this.removeRequestListener();
        break;
      // TODO what is the right behavior on "Unavailable"?
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
        const siteContext = self.siteContexts.get(parsedHostname);
        if (siteContext) {
          log("Intercepting web request. Redirect to local proxy.");
          return [...siteContext.proxyInfo];
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
