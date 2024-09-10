/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "../shared/utils.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";
import { ExtensionController, FirefoxVPNState } from "./extensionController/index.js";
import { ProxyHandler, ProxyRules, ProxyUtils } from "./proxyHandler/index.js"

import { propertySum } from "../shared/property.js";

const log = Logger.logger("RequestHandler");

/**
 * Handles request interception, inspection, and determines whether a request should be proxied.
 * 
 */
export class RequestHandler extends Component {
  /**
   * 
   * @param {*} receiver The message receiver for the RequestHandler.
   * @param {VPNController} controller Instance of the VPNController that manages VPN states.
   * @param {ExtensionController} extController Instance of the ExtensionController that manages extension states.
   * @param {ProxyHandler} proxyHandler Instance of the ProxyHandler to manage proxy rules.
   */
  constructor(receiver, controller, extController, proxyHandler) {
    super(receiver);
    this.active = false;
    this.cachedProxyRule = null;
    this.cachedDefaultProxyInfo = null;

    extController.state.subscribe((s) => { 
      this.handleExtensionStateChanges(s);
    });

    propertySum(
      controller.state,
      proxyHandler.siteContexts,
      (currentVPNState, currentSiteContextMap) => {
        return resolveSiteContext(currentSiteContextMap, currentVPNState);
      }
    ).subscribe((proxyMap) => {
      this.onNewProxyMap(proxyMap);
    });
  }


   /**
   * Handles changes in extension state and updates request listener.
   * @param {FirefoxVPNState} extState
   * @param {Object} proxyRule
   */
  handleExtensionStateChanges(extState) {
    const proxyRule = ext.proxyRule;
    this.cachedProxyRule = proxyRule.type;
    this.cachedDefaultProxyInfo = proxyRule.defaultProxyInfo;

    if ([ProxyRules.BYPASS_TUNNEL, ProxyRules.USE_EXIT_RELAYS].includes(proxyRule.type)) {
      return this.maybeAddRequestListener();
    } 

    switch (extState.state) {
      case "Idle":
      case "Disabled":
        this.maybeRemoveRequestListener();
        break;
      case "Enabled":
        this.maybeAddRequestListener();
        break;
    }
  }

  /**
   *
   * @param {Map<string, Array<browser.proxy.proxyInfo>>} proxyMap
   */
  onNewProxyMap(proxyMap) {
    if (!proxyMap) {
      return;
    }
    this.proxyMap = proxyMap;

    if (proxyMap.size === 0) {
      this.maybeRemoveRequestListener();
      return;
    }
    if (proxyMap.size > 0) {
      this.maybeAddRequestListener();
    }
  }

  /** @type {Map<string, SiteContext>} */
  siteContexts;

  async init() {
    log("Initiating RequestHandler");
  }

  maybeAddRequestListener() {
    if (this.active || !this.cachedProxyRule) {
      return;
    }
    log(
      `Starting listening for requests, active rules ${this.proxyMap?.size}, active proxy rule ${this.cachedProxyRule.type}`
    );
    browser.proxy.onRequest.addListener(this.interceptRequests.bind(this), {
      urls: ["<all_urls>"],
    });

    this.active = true;
  }


  /**
   * Intercepts and processes requests to determine if they should be proxied.
   * 
   * @async
   * @param {proxy.RequestDetails} requestInfo The details of the incoming request.
   * @returns {browser.proxy.proxyInfo | undefined} Proxy information for the request, or undefined for default.
   */
  async interceptRequests(requestInfo) {
    if ([ProxyRules.DIRECT, ProxyRules.USE_EXIT_RELAYS].includes(this.cachedProxyRule)) {
      let { documentUrl } = requestInfo;
      // If we load an iframe request the top level document.
      if (requestInfo.frameId !== 0) {
        let topLevelFrame = await browser.webNavigation.getFrame({
          frameId: requestInfo.parentFrameId,
          tabId: requestInfo.tabId,
        });
        documentUrl = topLevelFrame.url;
      }
  
      for (let urlString of [documentUrl]) {
        if (urlString) {
          const parsedHostname = Utils.getFormattedHostname(urlString);
          const proxyInfo = this.proxyMap.get(parsedHostname);
          if (proxyInfo) {
            return proxyInfo;
          }
        }
      }
    }
    // No custom proxy for the site, return default connection
    return this.cachedDefaultProxyInfo;
  }

  maybeRemoveRequestListener() {
    if (!this.active) {
      return;
    }
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

  if (vpnState.servers.length === 0) {
    return;
  }
  const result = new Map();

  const localProxy = vpnState.loophole
    ? [ProxyUtils.parseProxy(vpnState.loophole)]
    : [];


  siteContexts.forEach((ctx, origin) => {
    if (ctx.excluded) {
      result.set(origin, [...localProxy]);
    } else {
      result.set(
        origin,
        ProxyUtils.getProxies(ctx.countryCode, ctx.cityCode, vpnState.servers)
      );
    }
  });
  return result;
};

/**
 * Contains information about a web request. An instance of this object is passed into the proxy.onRequest listener.
 *
 * @typedef {Object} proxy.RequestDetails
 * @property {string} cookieStoreId - The cookie store ID of the current context. See Work with contextual identities for more information.
 * @property {string} documentUrl - URL of the page into which the requested resource will be loaded.
 * @property {number} frameId - Zero if the request happens in the main frame; a positive value is the ID of a subframe in which the request happens. If the document of a (sub-)frame is loaded (type is main_frame or sub_frame), frameId indicates the ID of this frame, not the ID of the outer frame. Frame IDs are unique within a tab.
 * @property {boolean} fromCache - Indicates if this response will be fetched from disk cache.
 * @property {boolean} incognito - true for private browsing requests.
 * @property {string} method - Standard HTTP method: for example, "GET" or "POST".
 * @property {string} originUrl - URL of the resource that triggered the request. Note that this may not be the same as the URL of the page into which the requested resource will be loaded. For example, if a document triggers a load in a different window through the target attribute of a link, or a CSS document includes an image using the url() functional notation, then this is the URL of the original document or of the CSS document, respectively.
 * @property {number} parentFrameId - ID of the frame that contains the frame that sent the request. Set to -1 if no parent frame exists.
 * @property {string} requestId - The ID of the request. Request IDs are unique within a browser session, so you can use an ID to identify different events associated with the same request.
 * @property {webRequest.HttpHeaders} [requestHeaders] - The HTTP request headers that will be sent with this request. Note that this is only included if the "requestHeaders" option was passed into addListener().
 * @property {number} tabId - ID of the tab in which the request takes place. Set to -1 if the request is not related to a tab.
 * @property {boolean} thirdParty - Indicates whether the request and its content window hierarchy is third party.
 * @property {number} timeStamp - The time when this event fired, in milliseconds since the epoch.
 * @property {webRequest.ResourceType} type - The type of resource being requested: for example, "image", "script", or "stylesheet".
 * @property {string} url - Target of the request.
 */
