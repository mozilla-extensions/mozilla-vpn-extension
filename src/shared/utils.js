/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import suffixes from "./suffixes.js";

import Constants from "./constants.js";

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

  connectingDelay: 2500,

  // Hack to mitigate FXVPN-217 and FXVPN-222.
  // When transitioning from StateFirefoxVPNConnecting to StateFirefoxVPNEnabled,
  // the client enters StateOnPartial wherein routing table updates can cause
  // long page reloads or even timeouts.
  // To offset this, we introduce a delay in the UI and before reloading tabs,
  // allowing the OS a buffer in which to update routing tables.
  delayToStateEnabledNeeded(currentState, newState) {
    if (!currentState) {
      return false;
    }
    return currentState === "Connecting" && newState === "Enabled";
  },

  isViableClientVersion: (
    clientVersion = "0.0.0",
    minimumViableClient = Constants.MINIMUM_VPN_VERSION
  ) => {
    let client = clientVersion.split(".").map((a) => parseInt(a, 10));
    let minimum = minimumViableClient.split(".").map((a) => parseInt(a, 10));

    if (client.length != 3) {
      throw new Error(
        `Client version does not match format A.B.C -> ${clientVersion}`
      );
    }
    if (minimum.length != 3) {
      throw new Error(
        `minimumViableClient version does not match format A.B.C -> ${minimumViableClient}`
      );
    }
    for (let i = 0; i < 3; ++i) {
      if (client[i] != minimum[i]) {
        return client[i] > minimum[i];
      }
    }
    return true;
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
  getDomainName(url) {
    // Remove any prefixes from the URL
    url = this.stripPrefixesFromUrl(url);

    try {
      // Parse the URL to extract the hostname
      const parsedUrl = new URL(url);
      const hostnameParts = parsedUrl.hostname.split(".");

      // Combine the last two parts of the hostname, drop the rest (e.g., "example.com")
      const formattedDomain = hostnameParts.slice(-2).join(".");

      if (!formattedDomain) {
        // (e.g., "about:debugging")
        return url;
      }

      // Handle eTLD+1 domains (e.g., "https://www.lanacion.com.ar")
      if (suffixes.includes(formattedDomain)) {
        // We've only captured the suffix of an eTLD+1 domain,
        // We need to grab more of the url to capture the second-level domain
        return hostnameParts.slice(-3).join(".");
      }

      return formattedDomain;
    } catch (error) {
      // Return the original URL for invalid inputs
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

  deepEquals: (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!Utils.deepEquals(a[i], b[i])) return false;
      }
      return true;
    }

    // Handle Set
    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      // Sets are unordered, so compare values as arrays after sorting
      const arrA = Array.from(a).sort();
      const arrB = Array.from(b).sort();
      return Utils.deepEquals(arrA, arrB);
    }

    // Handle Map
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      // Compare entries as arrays after sorting by key
      const arrA = Array.from(a.entries()).sort();
      const arrB = Array.from(b.entries()).sort();
      return Utils.deepEquals(arrA, arrB);
    }

    // Handle plain objects
    if (typeof a === "object" && typeof b === "object") {
      if (
        Array.isArray(a) ||
        Array.isArray(b) ||
        a instanceof Set ||
        b instanceof Set ||
        a instanceof Map ||
        b instanceof Map
      ) {
        // Already handled above
        return false;
      }
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      keysA.sort();
      keysB.sort();
      for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i]) return false;
        if (!Utils.deepEquals(a[keysA[i]], b[keysB[i]])) return false;
      }
      return true;
    }

    // Handle general iterables (not array, set, map, or plain object)
    if (
      typeof a === "object" &&
      typeof b === "object" &&
      a[Symbol.iterator] &&
      b[Symbol.iterator] &&
      typeof a !== "string" &&
      typeof b !== "string"
    ) {
      const iterA = a[Symbol.iterator]();
      const iterB = b[Symbol.iterator]();
      while (true) {
        const resultA = iterA.next();
        const resultB = iterB.next();
        if (resultA.done && resultB.done) return true;
        if (resultA.done !== resultB.done) return false;
        if (!Utils.deepEquals(resultA.value, resultB.value)) return false;
      }
    }

    // If we reach here, the values are not equal
    return false;
  },
};
