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
  nameFor: (
    countryCode = "de",
    cityCode = "ber",
    serverList = [new ServerCountry()]
  ) => {
    if (!serverList) {
      return "";
    }
    return serverList
      .find((sc) => sc.code === countryCode)
      ?.cities.find((c) => c.code === cityCode)?.name;
  },
};
