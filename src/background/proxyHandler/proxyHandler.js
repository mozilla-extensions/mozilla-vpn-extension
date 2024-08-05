/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "../component.js";
import { Logger } from "../logger.js";

import { property } from "../../shared/property.js";

import { SiteContext } from "./siteContext.js";
import { ProxyUtils } from "./proxyUtils.js";
import { PropertyType } from "../../shared/ipc.js";

const log = Logger.logger("ProxyHandler");

/**
 * This class manages tasks related to creating and storing
 * proxy information for specific origins (siteContexts).
 */
export class ProxyHandler extends Component {
  // Things to expose to the UI
  static properties = {
    siteContexts: PropertyType.Bindable,
    addSiteContext: PropertyType.Function,
  };

  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
  }

  /** @type {VPNState | undefined} */
  controllerState;

  #mSiteContexts = property(new Map());
  currentPort;

  get siteContexts() {
    return this.#mSiteContexts.readOnly;
  }

  async init() {
    log("Initializing ProxyHandler");

    this.controller.state.subscribe((s) => {
      this.controllerState = s;
    });

    this.#mSiteContexts.value = await this.#getSiteContexts();

    browser.runtime.onConnect.addListener(async (port) => {
      await this.portConnected(port);
    });
  }

  async addSiteContext(siteContext) {
    const siteContexts = await this.#mSiteContexts.value;
    siteContexts.set(siteContext.origin, { ...siteContext });
    return this.#setSiteContexts(siteContexts);
  }

  /**
   * Creates a SiteContext for an origin and adds
   * local socks proxy values for proxyInfo
   * @param {string} origin - The origin to exclude.
   */
  async excludeOrigin(origin) {
    const excluded = true;
    const siteContext = new SiteContext({ origin, excluded, proxyInfo });
    return this.addSiteContext(siteContext);
  }

  async #getSiteContexts() {
    let { siteContexts } = await browser.storage.local.get([
      ProxyUtils.getSiteContextsStorageKey(),
    ]);
    if (!siteContexts) {
      siteContexts = new Map();
      await this.#setSiteContexts(siteContexts);
    }
    return siteContexts;
  }
  /**
   * Removes the SiteContext of the provided origin
   * @param {string} origin - The origin to exclude.
   */
  async #removeContextForOrigin(origin) {
    const siteContexts = this.#mSiteContexts.value;
    siteContexts.delete(origin);
    return this.#setSiteContexts(siteContexts);
  }

  /**
   * Takes in an Object containing an origin, cityName, and countryCode.
   * Creates an array of proxyInfo objects for the location and attaches it
   * to the origin in a new SiteContext.
   * @param {Object} info - An object containing an origin, countryCode, and cityName.
   * @param {string} info.origin
   * @param {string} info.countryCode
   * @param {string} info.cityName
   */
  async #setContextForOrigin(info) {
    const proxyInfo = await ProxyUtils.getProxies(
      info.countryCode,
      info.cityName,
      this.controllerState.servers
    );
    const siteContext = new SiteContext({ ...info, proxyInfo });
    return this.addSiteContext(siteContext);
  }

  /**
   * Stores the updated siteContexts map.
   * @param {Map} siteContexts - The site contexts map to store be stored.
   */
  async #setSiteContexts(siteContexts) {
    try {
      await browser.storage.local.set({
        [ProxyUtils.getSiteContextsStorageKey()]: siteContexts,
      });
      this.#mSiteContexts.value = siteContexts;
    } catch (error) {
      log(`Error setting site contexts: ${error.message}`);
    }
  }
}
