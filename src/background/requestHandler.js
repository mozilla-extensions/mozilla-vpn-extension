/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "../shared/utils.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";
import { ProxyHandler } from "./proxyHandler/proxyHandler.js";
import { ProxyUtils } from "./proxyHandler/proxyUtils.js";

import { propertySum } from "../shared/property.js";

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
   *  @param {ProxyHandler} proxyHandler
   */
  constructor(receiver, controller, proxyHandler) {
    super(receiver);
    this.controller = controller;
    /** @type {ProxyHandler}  */
    this.proxyHandler = proxyHandler;
    this.active = false;

    propertySum(
      controller.state,
      proxyHandler.siteContexts,
      (currentVPNState, currentSiteContextMap) => {
        return resolveSiteContext(currentSiteContextMap, currentVPNState);
      }
    ).subscribe((proxyMap) => {
      console.log(proxyMap);
      this.onNewProxyMap(proxyMap);
    });

    self = this;
  }

  /**
   *
   * @param {Map<string, Array<browser.proxy.proxyInfo>>} proxyMap
   */
  onNewProxyMap(proxyMap) {
    this.proxyMap = proxyMap;
    if (proxyMap.size === 0 && this.active) {
      this.removeRequestListener();
      return;
    }
    if (!this.active && proxyMap.size > 0) {
      this.addRequestListener();
    }
  }

  /** @type {VPNState | undefined} */
  controllerState;
  /** @type {Map<string, SiteContext>} */
  siteContexts;

  async init() {
    log("Initiating RequestHandler");
  }

  addRequestListener() {
    console.log(
      `Starting listening for requests, active rules ${this.proxyMap.size}`
    );
    browser.proxy.onRequest.addListener(this.interceptRequests.bind(this), {
      urls: ["<all_urls>"],
    });
    this.active = true;
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
        const proxyInfo = this.proxyMap.get(parsedHostname);
        if (proxyInfo) {
          log(`Sending ${parsedHostname} to ${proxyInfo[0].host}`);
          return proxyInfo;
        }
      }
    }

    // No custom proxy for the site, return direct connection
    return { direct: true };
  }

  removeRequestListener() {
    log("Removing request listener");
    const ok = browser.proxy.onRequest.removeListener(this.interceptRequests);
    this.active = false;
    return ok;
  }
}

/**
 * @typedef {Object} browser.proxy.proxyInfo
 * @property {string} type - The connection type
 * @property {string?} [username] - The username for the connection (optional).
 * @property {string?} [password] - The password for the connection (optional).
 * @property {string} host - The host for the connection (required).
 * @property {string} port - The port for the connection (required).
 *
 * @typedef {import("./proxyHandler/siteContext.js").SiteContext} SiteContext
 *
 */

/**
 *
 * Maps (VPNState+SiteContextMap) to a Map<origin:selectedProxies>
 *
 * @param {Map<string, SiteContext>} siteContexts
 * @param {VPNState} vpnState
 * @returns {Map<string, Array<browser.proxy.proxyInfo>>}
 */
export const resolveSiteContext = (siteContexts, vpnState) => {
  /** @type {Map<string, Array<browser.proxy.proxyInfo>>} */
  const result = new Map();
  const localProxy = vpnState.loophole
    ? [ProxyUtils.parseProxy(vpnState.loophole)]
    : [];
  siteContexts.forEach((ctx, origin) => {
    if (ctx.excluded) {
      result.set(origin, { ...localProxy });
    } else {
      result.set(
        origin,
        ProxyUtils.getProxies(ctx.countryCode, ctx.cityCode, vpnState.servers)
      );
    }
  });
  return result;
};
