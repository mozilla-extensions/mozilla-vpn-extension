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
 * proxy information to be used by the UI and RequestHandler.
 *
 */
export class ProxyHandler extends Component {
  // Things to expose to the UI
  static properties = {
    siteContexts: PropertyType.Bindable,
    addSiteContext: PropertyType.Function,
    removeContextForOrigin: PropertyType.Function,
  };

  /**
   *
   * @param {*} receiver
   * @param {VPNController} controller Instance of the VPNController that manages VPN states.
   */
  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
  }

  /** @type {VPNState | undefined} */
  controllerState;
  /** @type {Array <ServerCountry> } */
  servers;

  #mSiteContexts = property(new Map());
  #lastChangedOrigin = property("");
  #mProxyMap = property(new Map());
  #mLocalProxyInfo = property([]);
  #mCurrentExitRelays = property([]);

  /** @type {IBindable<Map<String, SiteContext>>} */
  get siteContexts() {
    return this.#mSiteContexts.readOnly;
  }

  /**
   * Returns an array containing proxy information
   * for the user's local socks proxy.
   *  @type {IBindable<Map<String, Array>>}
   *  */
  get localProxyInfo() {
    return this.#mLocalProxyInfo.readOnly;
  }

  /**
   * Returns a map of origins and proxy information
   * for sites with special proxy settings.
   * @type {IBindable<Map<String, Map>>}
   * */
  get proxyMap() {
    return this.#mProxyMap.readOnly;
  }

  /**
   * Returns the array of proxyInfo objects,
   * in the VPN client's current server
   * location.
   * @type {IBindable<Map<String, Array>>}
   * */
  get currentExitRelays() {
    return this.#mCurrentExitRelays.readOnly;
  }
  /**
   * Returns a bindable containing the last origin
   * whos siteContext got changed
   * @type {IBindable<String>}
   * */
  get lastChangedOrigin() {
    return this.#lastChangedOrigin.readOnly;
  }

  async init() {
    log("Initializing ProxyHandler");

    this.controller.servers.subscribe((s) => (this.servers = s));

    this.controller.state.subscribe((s) => {
      this.controllerState = s;
      this.processClientStateChanges(s);
    });

    this.#mSiteContexts.value = await this.#getSiteContexts();
  }

  /**
   *
   * @param {VPNState} vpnState
   * @returns
   */
  processClientStateChanges(vpnState) {
    console.log(`Processing client state change ${vpnState}`);
    this.#mLocalProxyInfo.value = vpnState.loophole
      ? [ProxyUtils.parseProxy(vpnState.loophole)]
      : [];

    if (this.servers.length == 0) {
      console.log("No servers, unable to get exit location proxy info");
      return;
    }

    const { exitServerCity, exitServerCountry } = vpnState;
    if (exitServerCountry.code == "") {
      console.log(
        "No exit location information available, unable to get exit location proxy info"
      );
      return;
    }

    const proxies = ProxyUtils.getProxies(
      exitServerCountry.code,
      exitServerCity.code,
      this.servers
    );

    this.#mCurrentExitRelays.value = proxies;

    console.log(`Updated #mCurrentExitRelays to ${this.#mCurrentExitRelays}`);

    if (this.#mSiteContexts.value.size > 0) {
      this.updateProxyMap(this.#mSiteContexts.value, this.servers);
    }
  }

  updateProxyMap(newProxyMap, servers) {
    const result = new Map();
    newProxyMap.forEach((ctx, origin) => {
      if (ctx.excluded) {
        result.set(origin, [...this.#mLocalProxyInfo.value]);
      } else {
        result.set(
          origin,
          ProxyUtils.getProxies(ctx.countryCode, ctx.cityCode, servers)
        );
      }
    });
    this.#mProxyMap.value = result;
    console.log(`Updated #mCurrentExitRelays to ${this.#mCurrentExitRelays}`);
    return result;
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
    this.#lastChangedOrigin.set(siteContext.origin);
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
    this.#lastChangedOrigin.set(origin);
    return this.#setSiteContexts(siteContexts);
  }

  /**
   * Stores the updated siteContexts map.
   * @param {Map} siteContexts - The site contexts map to store be stored.
   */
  async #setSiteContexts(siteContexts) {
    try {
      this.#mSiteContexts.value = siteContexts;
      this.updateProxyMap(this.#mSiteContexts.value, this.servers);
      await browser.storage.local.set({
        [ProxyUtils.getSiteContextsStorageKey()]: siteContexts,
      });
    } catch (error) {
      console.log(`Error setting site contexts: ${error.message}`);
    }
  }
}
