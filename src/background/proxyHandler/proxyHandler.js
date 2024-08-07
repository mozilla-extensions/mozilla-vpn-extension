/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "../component.js";
import { Logger } from "../logger.js";

import { IBindable, property } from "../../shared/property.js";

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
    removeContextForOrigin: PropertyType.Function,
  };

  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
  }

  /** @type {VPNState | undefined} */
  controllerState;

  #mSiteContexts = property(new Map());
  currentPort;

  /** @type {IBindable<Map<String, SiteContext>>} */
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

  /**
   *
   * @param {SiteContext} siteContext
   * @returns
   */
  async addSiteContext(siteContext) {
    if (!siteContext.origin && typeof siteContext.origin != String) {
      throw new Error("Invalid Origin for Site context");
    }
    if (!siteContext.excluded) {
      // If the context is not to exclude, those are mandatory!
      if (!siteContext.cityCode) {
        throw new Error("Invalid cityCode");
      }
      if (!siteContext.countryCode) {
        throw new Error("Invalid countryCode");
      }
    }

    const siteContexts = await this.#mSiteContexts.value;
    siteContexts.set(siteContext.origin, { ...siteContext });
    return this.#setSiteContexts(siteContexts);
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
  async removeContextForOrigin(origin) {
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
    console.log(siteContexts);
    try {
      this.#mSiteContexts.value = siteContexts;
      await browser.storage.local.set({
        [ProxyUtils.getSiteContextsStorageKey()]: siteContexts,
      });
    } catch (error) {
      log(`Error setting site contexts: ${error.message}`);
    }
  }
}
