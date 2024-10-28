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

  isViableClientVersion: (clientVersion) => {

    // TODO we should do something better here
    // We'll likely want to update the minimumViableClient
    // out of band at some point.
    const minimumViableClient = "2.25.0";
    return parseInt(clientVersion) < parseInt(minimumViableClient);
  },

  /**
   * Formats and retrieves the hostname from a given URL.
   * @param {string} url - The URL to format.
   * @returns {string} - The formatted hostname. Is empty if not valid for extension context.
   */
  getFormattedHostname(url) {
    // Handle sites being viewed in reader mode
    // TODO... other prefixes(?)
    const readerPrefix = "about:reader?url=";
    if (url.startsWith(readerPrefix)) {
      const encodedUrl = url.slice(readerPrefix.length);
      url = decodeURIComponent(encodedUrl);
    }
    const getHostname = (aUrl) => {
      try {
        const urlObj = new URL(aUrl);
        return urlObj.hostname;
      } catch (e) {
        return null;
      }
    };
    let hostname = getHostname(url);

    // Use the entire URL if hostname is not valid (like about:debugging)
    if (!hostname || hostname === "") {
      return url;
    }
    return hostname;
  },

  isValidForProxySetting: (url) => {
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
};
