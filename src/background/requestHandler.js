/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "./utils.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";

const log = Logger.logger("RequestHandler");

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
  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
  }

  /** @type {VPNState | undefined} */
  controllerState;

  async init() {
    log("Initiating RequestHandler");

    this.controller.state.subscribe((s) => (this.controllerState = s));

    browser.proxy.onRequest.addListener(this.interceptRequests, {
      urls: ["<all_urls>"],
    });
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
        const siteContext = await Utils.getContextForOrigin(parsedHostname);
        if (siteContext) {
          return [siteContext.proxyInfo];
        }
      }
    }

    // No custom proxy for the site, return direct connection
    return { direct: true };
  }
}