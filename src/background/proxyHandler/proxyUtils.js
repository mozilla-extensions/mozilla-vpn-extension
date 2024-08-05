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
  getSiteContextsStorageKey() {
    return "siteContexts";
  },

  /**
   * Finds the servers available for provided location, orders them by weight,
   * and returns an array of proxyInfo objects.
   * @param {string} countryCode - The two-digit code for the country where the server is located.
   * @param {string} cityCode - The name of the city where the server is located.
   * @param {any[]} servers - The server list.
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
