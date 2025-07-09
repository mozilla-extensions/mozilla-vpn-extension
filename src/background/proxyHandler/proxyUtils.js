/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const ProxyUtils = {
  /**
   * The storage key used to set and retrieve the map
   * of siteContexts from browser storage.
   *
   * @readonly
   * @type {string}
   */
  SiteContextsStorageKey: "siteContexts",

  getDirectProxyInfoObject() {
    return { type: "direct" };
  },

  /**
   * Checks if a given browser proxy setting is valid.
   *
   * @param {BrowserSettingValue} settingValue - The proxy settings object as defined by the
   *   WebExtensions API.
   * @returns {boolean} True if the setting is valid and contains a usable proxy configuration, false otherwise.
   */
  browserProxySettingIsValid(settingValue) {
    if (!settingValue) {
      return false;
    }
    if (settingValue.proxyType === "none") {
      return false;
    }
    if (settingValue.proxyType === "manual") {
      // At least one of http, https, or socks must be a valid URL
      return [settingValue.http, settingValue.https, settingValue.socks].some(
        (value) => {
          if (typeof value !== "string" || !value) {
            return false;
          }
          return URL.canParse(value);
        }
      );
    }
    if (settingValue.proxyType === "autoConfig") {
      // autoConfigUrl must be a valid URL
      if (
        typeof settingValue.autoConfigUrl !== "string" ||
        !settingValue.autoConfigUrl
      ) {
        return false;
      }
      return URL.canParse(settingValue.autoConfigUrl);
    }
    // For other types (system, autoDetect), treat as not valid for proxy URLs
    return false;
  },
  /**
   * Finds the servers available for provided location, orders them by weight,
   * and returns an array of proxyInfo objects.
   * @param {string} countryCode - The two-digit code for the country where the server is located.
   * @param {string} cityCode - The name of the city where the server is located.
   * @param {import("../../components/serverlist").ServerCountryList} proxyServers - The server list.
   */
  getProxies(countryCode, cityCode, proxyServers) {
    const serverCountry = proxyServers.find(({ code }) => code === countryCode);
    const serverCity = serverCountry.cities.find(
      ({ code }) => code === cityCode
    );

    const parsedProxies = [];

    serverCity.servers
      .filter((server) => server.socksName)
      .sort((a, b) => b.weight - a.weight)
      .forEach(({ socksName }) => {
        parsedProxies.push(
          this.parseProxy(`socks://${socksName}.mullvad.net:1080`)
        );
      });

    return parsedProxies;
  },

  /**
   * Takes in a proxy url and parses it for the type,
   * username, password, host, and port.
   * @param {string} proxyStr - The proxy url string.
   */
  parseProxy(proxyStr) {
    const proxyRegexp =
      /(?<type>(https?)|(socks4?)):\/\/(\b(?<username>[\w-]+):(?<password>[\w-]+)@)?(?<host>((?:\d{1,3}\.){3}\d{1,3}\b)|(\b([\w.-]+)+))(:(?<port>\d+))?/;
    const matches = proxyRegexp.exec(proxyStr);
    if (!matches) {
      return null;
    }

    return { ...matches.groups };
  },
};

/**
 * @typedef {Object} BrowserSettingValue
 * @property {string} proxyType - The type of proxy to use. One of "none", "autoDetect", "system", "manual", or "autoConfig".
 * @property {string} [autoConfigUrl] - The URL of the proxy auto-configuration (PAC) file to use (if proxyType is "autoConfig").
 * @property {string} [http] - The HTTP proxy server to use (if proxyType is "manual").
 * @property {string} [https] - The HTTPS proxy server to use (if proxyType is "manual").
 * @property {string} [ftp] - The FTP proxy server to use (if proxyType is "manual").
 * @property {string} [socks] - The SOCKS proxy server to use (if proxyType is "manual").
 * @property {number} [socksVersion] - The version of the SOCKS protocol to use (4 or 5).
 * @property {string[]} [passthrough] - A list of hostnames that will bypass the proxy.
 */
