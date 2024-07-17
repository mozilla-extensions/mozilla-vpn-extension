/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import { Component } from "./component.js";
import { Logger } from "./logger.js";
import { Utils } from "./utils.js";
 
const log = Logger.logger("ProxyHandler");

class SiteContext {
  constructor(context) {
    context ??= {}
    this.origin = context.origin ?? "";
    this.cityName = context.cityName ?? "";
    this.countryCode = context.countryCode ?? "";
    this.excluded = context.excluded ?? false;
    this.proxyInfo = context.proxyInfo ?? [];
  }
}
 
/**
 * This class manages tasks related to creating and storing 
 * proxy information (contexts) for specific origins. 
 */
export class ProxyHandler extends Component {
  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
  }

  /** @type {VPNState | undefined} */
  controllerState;

  async init() {
    this.controller.state.subscribe(s => {
      this.controllerState = s;
    });
  }

  /**
   * Creates a new SiteContext for an origin and adds 
   * local socks proxy values for proxyInfo
   * @param {string} origin - The origin to exclude.
   */
  async #excludeOrigin(origin) {
    const excluded = true;
    // TODO: Replace with real local proxy info ✨
    const proxyInfo = [{
      host: "us-dal-wg-socks5-504.relays.mullvad.net",
      password: undefined,
      port: "1080",
      proxyDNS: true,
      type: "socks",
      username: undefined
    }];
    const siteContext = new SiteContext({origin, excluded, proxyInfo});
    return this.#addSiteContext(siteContext);
  }

  /**
   * Retrieves the list of socks severs for a given location, ordered by weight, 
   * and creates an array of proxyInfo objects.
   * @param {string} countryCode - The two digit code for the country where the server is located.
   * @param {string} cityName - The name of the city where the server is located.
   */
  async #getProxies(countryCode, cityName) {
    const proxyServers = this.#getOrderedSocksServerListForLocation(countryCode, cityName);
    const parsedProxies = [];
    proxyServers.forEach(({ socksName }) => { 
      parsedProxies.push(this.#parseProxy(`socks://${socksName}.mullvad.net:1080`));
    });
    return parsedProxies;
  }

  /**
   * Retrieves an array of available Mullvad servers for a given city.
   * Filters the array for servers with a socksName property and sorts
   * the array by weight in descending order.
   * @param {string} countryCode - The country code.
   * @param {string} cityName - The city name.
   */
  #getOrderedSocksServerListForLocation(countryCode, cityName) {
    const serverCountry = this.controllerState.servers.find(({code}) => code === countryCode);
    const serverCity = serverCountry.cities.find(({name}) => name === cityName);
    return serverCity.servers
      .filter(server => server.socksName)
      .sort((a, b) => b.weight - a.weight);
  }

  /**
   * Handles events sent from the UI.
   * @param {string} type - The event type.
   * @param {Object} data - The event data.
   */
  handleEvent(type, data) {
    switch (type) {
      case "add-context":
        log(`Adding origin: ${data.origin}`);
        return this.#setContextForOrigin(data);
      case "remove-context":
        log(`Removing context for origin: ${data.origin}`);
        return this.#removeContextForOrigin(data.origin);
      case "exclude-origin":
        log(`Excluding origin: ${data.origin}`);
        return this.#excludeOrigin(data.origin);
    }
  }

  /**
   * Takes in a proxy url and parses it for the type, 
   * username, password, host, and port.
   * @param {string} proxyStr - The proxy string.
   */
  #parseProxy(proxyStr) {
    const proxyRegexp = /(?<type>(https?)|(socks4?)):\/\/(\b(?<username>[\w-]+):(?<password>[\w-]+)@)?(?<host>((?:\d{1,3}\.){3}\d{1,3}\b)|(\b([\w.-]+)+))(:(?<port>\d+))?/;
    const matches = proxyRegexp.exec(proxyStr);
    if (!matches) {
      return false;
    }
    return {...matches.groups};
  }

  async #removeContextForOrigin(origin) {
    const {siteContexts} = await Utils.getSiteContexts();
    siteContexts.delete(origin);
    
    return this.#setSiteContexts(siteContexts);
  }

  /**
   * Takes in an Object containing an origin, cityName, and countryCode. 
   * Creates an array of proxyInfo objects for the location and attaches it
   * to the origin in a new SiteContext. 
   * @param {Object} info - An object containing an origin, countryCode, and cityName.
   */
  async #setContextForOrigin(info) {
    const proxyInfo = await this.#getProxies(info.countryCode, info.cityName);

    const siteContext = new SiteContext({...info, proxyInfo});
    return this.#addSiteContext(siteContext)
  }

  async #addSiteContext(siteContext) {
    const {siteContexts} = await Utils.getSiteContexts();
    siteContexts.set(siteContext.origin, {...siteContext});

    return this.#setSiteContexts(siteContexts);
  }

  /**
   * Adds the updates siteContexts map  and sends an update message.
   * @param {Map} siteContexts - The site contexts map to store be stored.
   */
  async #setSiteContexts(siteContexts) {
    try {
      await browser.storage.local.set({ [SITE_CONTEXTS_STORAGE_KEY]: siteContexts });
      return this.sendMessage("site-contexts-updated");
    } catch (error) {
      log(`Error setting site contexts: ${error.message}`);
    }
  }
}