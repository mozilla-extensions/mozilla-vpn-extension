/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Here you'll find utility functions for managing
 * site contexts and handling various tasks.
 */
export const Utils = {
  /**
   * Retrieves the currently active tab.
   * @returns {Promise<browser.tabs.Tab>} - The current active tab.
   */
  async getCurrentTab() {
    let currentTab = await browser.tabs.query({
      currentWindow: true,
      active: true,
    });
    return currentTab[0];
  },

  isSupportedOs(os) {
    return ["win"].includes(os);
  },

  isViableClientVersion: (clientVersion) => {
    // TODO we should do something better here
    // We'll likely want to update the minimumViableClient
    // out of band at some point.
    const minimumViableClient = "2.25.0";
    return parseInt(clientVersion) < parseInt(minimumViableClient);
  },

  /**
   * Formats and retrieves the hostname from a given URL.
   * @param {string} url - URL to format.
   * @returns {string} -  URL sans prefixes.
   */
  stripPrefixesFromUrl(url) {
    // Handle sites being viewed in reader mode
    // TODO... other prefixes(?)
    const readerPrefix = "about:reader?url=";
    if (url.startsWith(readerPrefix)) {
      const encodedUrl = url.slice(readerPrefix.length);
      return decodeURIComponent(encodedUrl);
    }
    return url;
  },

  /**
   * Formats and retrieves the domain from a given URL.
   * @param {string} url - URL from which to retrieve the domain name.
   * @returns {string} - The domain name, or the url if a valid (within the context of the extension) domain name is not derived.
   */
  getTopLevelDomain(url) {
    url = this.stripPrefixesFromUrl(url);

    try {
      // Create a URL object from the input URL
      let parsedUrl = new URL(url);

      // Split the hostname to remove any subdomains or prefixes
      let domainParts = parsedUrl.hostname.split(".");

      // If the domain has more than two parts, remove subdomains (e.g., "reader.example.com" becomes "example.com")
      if (domainParts.length > 2) {
        return domainParts.slice(-2).join(".");
      }

      // If it's already just a domain name, return it
      return parsedUrl.hostname ? parsedUrl.hostname : url;
    } catch (error) {
      // Handle invalid URLs
      return url;
    }
  },

  isValidForProxySetting: (url) => {
    url = Utils.stripPrefixesFromUrl(url);

    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "https:" || urlObj.protocol === "http:";
    } catch (error) {
      return false;
    }
  },

  nameFor: (countryCode = "", cityCode = "", serverList = []) => {
    return Utils.getCity(countryCode, cityCode, serverList)?.name;
  },

  getCity: (countryCode = "", cityCode = "", serverList = []) => {
    if (!serverList) {
      return "";
    }
    if (serverList.length === 0) {
      return "";
    }
    return serverList
      .find((sc) => sc.code === countryCode)
      ?.cities.find((c) => c.code === cityCode);
  },


  /**
 * Generates a URL relative to the current module's location.
 * @param {string} relativePath - The relative path to resolve.
 * @returns {string} - The resolved absolute URL as a string.
 */
  resolveLocalURL: (relativePath) => {
  // Get the directory of the current module
  const moduleUrl = new URL(import.meta.url);
  const moduleDir = new URL('.', moduleUrl);

  // Resolve the relative path against the module's directory
  const resolvedUrl = new URL(relativePath, moduleDir);

  return resolvedUrl.toString();
}
};
