/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "../shared/utils.js";
import {
  ExtensionController,
  FirefoxVPNState,
} from "./extensionController/index.js";
import { ProxyHandler, ProxyUtils } from "./proxyHandler/index.js";
import { propertySum, property, IBindable } from "../shared/property.js";

const log = Logger.logger("RequestHandler");
/**
 * Handles request interception, inspection, and determines whether and where a request should be proxied.
 *
 * It interacts with the following Objects:
 * @param {ExtensionController} extController Determines the Default Route
 * -> i.e if we're off for Firefox and there is no rule -> Local Proxy will be used
 * -> i.e if we're on for Firefox and there is no rule -> Default Endpoint Proxy will be used.
 * @param {ProxyHandler} proxyHandler -> Determines the Per-Site Rule:
 * The Proxy Handler stores a map of Map<eTLD+1 ,(LocationProxy|LocalProxy)>
 * For every request we will check that.
 *
 * @param {webRequest.RequestFilter} filter -> Determines What Requests to handle.
 * We use this to make sure we can have a split between Private-Browsing and non PBM sessions.
 *
 */
export class RequestHandler extends Component {
  /**
   *
   * @param {*} receiver The message receiver for the RequestHandler.
   * @param {ExtensionController} extController Instance of the ExtensionController that manages extension states.
   * @param {ProxyHandler} proxyHandler Instance of the ProxyHandler to procure rules.
   * @param {webRequest.RequestFilter} filter A filter for which requests are relevant for this handler.
   */
  constructor(receiver, extController, proxyHandler, filter = {}) {
    super(receiver);
    this.active = false;
    this.localProxyInfo = [];
    this.currentExitRelays = [];
    this.browserProxySettings = property();
    this.defaultProxyInfo = propertySum(
      RequestHandler.toDefaultProxyInfo,
      this.browserProxySettings,
      extController.state,
      proxyHandler.currentExitRelays
    );
    this.filter = filter;

    browser.proxy.settings.get({}).then((v) => {
      this.browserProxySettings.set(v);
    });
    browser.proxy.settings.onChange.addListener((v) => {
      debugger;
      this.browserProxySettings.set(v);
    });
    // Every 10 Minutes Check poll the proxy settings
    // As browser.proxy.settings.onChange does not seem
    // to notify us if the user Changes the setting,
    // just another extension would...
    setInterval(() => {
      browser.proxy.settings.get({}).then((v) => {
        this.browserProxySettings.set(v);
      });
    }, 600000);

    /** @type {FirefoxVPNState | undefined} */
    this.extState = {};

    extController.state.subscribe((s) => {
      this.extState = s;
      return this.addOrRemoveRequestListener();
    });

    propertySum(
      (loophole, exitRelays) => {
        this.updateProxyInfoFromClient(loophole, exitRelays);
      },
      proxyHandler.localProxyInfo,
      proxyHandler.currentExitRelays
    );

    proxyHandler.proxyMap.subscribe((proxyMap) => {
      this.proxyMap = proxyMap;
      this.addOrRemoveRequestListener();
    });
  }

  updateProxyInfoFromClient(localProxy, exitRelays) {
    this.localProxyInfo = localProxy;
    this.currentExitRelay = exitRelays;
  }

  async init() {
    log("Initiating RequestHandler");
  }

  addOrRemoveRequestListener() {
    if (this.proxyAllReqsByDefault()) {
      return this.addRequestListener();
    }
    if (!this.extState.enabled) {
      return this.removeRequestListener();
    }

    if (this.proxyMap.size > 0) {
      return this.addRequestListener();
    }
  }

  #requestListener = () => {};
  addRequestListener() {
    if (browser.proxy.onRequest.hasListener(this.#requestListener)) {
      return;
    }
    this.#requestListener = (requestInfo) => {
      return RequestHandler.selectProxy(
        requestInfo,
        this.extState,
        this.proxyMap,
        this.localProxyInfo,
        this.defaultProxyInfo.value
      );
    };
    console.log(
      `Starting listening for requests, active rules ${this.proxyMap.size}`
    );
    browser.proxy.onRequest.addListener(this.#requestListener, {
      ...this.filter,
      urls: ["<all_urls>"],
    });
    this.active = true;
    return;
  }

  removeRequestListener() {
    console.log("Removing request listener");
    browser.proxy.onRequest.removeListener(this.#requestListener);
    this.active = false;
  }

  proxyAllReqsByDefault() {
    return (
      this.extState.bypassTunnel ||
      this.extState.useExitRelays ||
      (this.extState.enabled &&
        !this.extState.useExitRelays &&
        ProxyUtils.browserProxySettingIsValid(this.browserProxySettings?.value))
    );
  }

  /**
   * Handles a web request and determines the appropriate proxy server.
   *
   * For every Web-Request: We take the documentUrl, which is the Document the resource
   * will be loaded into. If that is not available we will consider just the resource URL.
   *
   * We then get the eTLD+1 for this and check if there is a matching
   * site rule and apply it.
   *
   * If there is no site rule this will return the proxy
   * passed into {defaultProxy}
   *
   *
   * @param {proxy.RequestDetails} requestInfo - The details of the web request.
   * @param {object} extensionState - The extension's state.
   * @param {Map} proxyMap - The map of proxy information.
   * @param {Array} bypassProxy - The bypass proxy information.
   * @param {Array} defaultProxy - The default proxy information.
   * @returns {browser.proxy.proxyInfo | null} The proxy information to use, or null if no proxy is needed.
   */
  static selectProxy(
    requestInfo,
    extensionState,
    proxyMap,
    bypassProxy,
    defaultProxy
  ) {
    if (extensionState.bypassTunnel) {
      return bypassProxy;
    }

    let { documentUrl, url } = requestInfo;

    for (let urlString of [documentUrl, url]) {
      if (urlString) {
        const parsedHostname = Utils.getDomainName(urlString);
        const proxyInfo = proxyMap.get(parsedHostname);
        if (proxyInfo) {
          return proxyInfo;
        }
      }
    }
    // No custom proxy for the site, return default connection
    return defaultProxy;
  }

  /**
   * Determines the default proxy information based on extension state and browser settings.
   * @param {IBindable<browser.proxy.proxyInfo>} browserProxySettings - The browser's proxy settings.
   * @param {FirefoxVPNState} extState - The extension's state.
   * @param {Array<browser.proxy.proxyInfo>} relays - The relay proxy information.
   * @returns {Array<browser.proxy.proxyInfo>} The default proxy information.
   */
  static toDefaultProxyInfo(browserProxySettings, extState, relays) {
    if (
      extState?.useExitRelays ||
      ProxyUtils.browserProxySettingIsValid(browserProxySettings?.value)
    ) {
      return relays;
    } else {
      return ProxyUtils.getDirectProxyInfoObject();
    }
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
 */

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
