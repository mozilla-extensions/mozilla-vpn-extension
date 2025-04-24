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
import { propertySum, property } from "../shared/property.js";

const log = Logger.logger("RequestHandler");
let self;
/**
 * Handles request interception, inspection, and determines whether a request should be proxied.
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
    self = this;

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
        this.defaultProxyInfo
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
    // If we load an iframe request the top level document.
    // if (requestInfo.frameId !== 0) {
    //   let topLevelFrame = await browser.webNavigation.getFrame({
    //     frameId: requestInfo.parentFrameId,
    //     tabId: requestInfo.tabId,
    //   });
    //   documentUrl = topLevelFrame.url;
    // }

    for (let urlString of [documentUrl, url]) {
      if (urlString) {
        const parsedHostname = Utils.getDomainName(urlString);
        const proxyInfo = proxyMap.get(parsedHostname);
        if (proxyInfo) {
          console.error(
            `Setting ${proxyInfo[0].host} for ${parsedHostname} -> filtered for ${requestInfo.incognito}`
          );
          return proxyInfo;
        }
      }
    }
    console.error(
      `Setting ${self.defaultProxyInfo.value[0].host} for ${documentUrl} - filtered for ${requestInfo.incognito}`
    );
    // No custom proxy for the site, return default connection
    return defaultProxy;
  }

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
