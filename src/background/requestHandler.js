/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Component} from "./component.js";
import {Logger} from "./logger.js";
import {VPNController,VPNState } from "./vpncontroller/index.js";

const log = Logger.logger("RequestHandler");

let self;

export class RequestHandler extends Component {
  /**
   * 
   * @param {*} receiver 
   * @param {VPNController} controller 
   */
  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
    self = this;
    
  }

  /** @type {VPNState | undefined} */
  controllerState;

  async init() {
    log("Initiating RequestHandler");

    this.controller.subscribe(s => this.controllerState = s);
  
    browser.proxy.onRequest.addListener(
      this.interceptRequests,
      {urls: ['<all_urls>']}
    );
  }

  createUrl(urlString) {
    try {
      return new URL(urlString);
    } catch (e) {
      return null;
    }
  }

  /**
   * 
   * @param { RequestDetails } requestInfo 
   * @returns 
   */
  async interceptRequests(requestInfo) {
    let {url, originUrl} = requestInfo;

    for (let urlString of [url, originUrl]) {

      if (urlString) {
          // Determine what to do with the request and 
          // maybe return [{...siteContext.proxyInfo}];
          log(`Observing req from ${self.createUrl(urlString)}`);
      }
    }

    // No custom proxy for site, don't do anything with the req
    return { direct: true };
  }
}
