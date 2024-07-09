/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

window.SITE_CONTEXTS_STORAGE_KEY = "siteContexts";
window.MOZILLA_VPN_SERVERS_KEY =  "mozillaVpnServers";


/**
 * Here you'll find utility functions for managing 
 * site contexts and handling various tasks. 
 */
export const Utils = {

  /**
   * Retrieves the context for a specific origin from storage.
   * @param {string} origin - The origin to retrieve the context for.
   * @returns {Promise<object>} - The context for the origin.
   */
  async getContextForOrigin(origin) {
    const {siteContexts} = await this.getSiteContexts();
    return siteContexts.get(origin);
  },

  /**
   * Retrieves the currently active tab.
   * @returns {Promise<browser.tabs.Tab>} - The current active tab.
   */
  async getCurrentTab() {
    let currentTab = await browser.tabs.query({currentWindow: true, active: true});
    return currentTab[0];
  },

  /**
   * Formats and retrieves the hostname from a given URL.
   * @param {string} url - The URL to format.
   * @returns {string} - The formatted hostname.
   */
  getFormattedHostname(url) {
    // Handle sites being viewed in reader mode
    // TODO... other prefixes(?)
    const readerPrefix = 'about:reader?url=';
    if (url.startsWith(readerPrefix)) {
      const encodedUrl = url.slice(readerPrefix.length);
      url = decodeURIComponent(encodedUrl);
    }
    
    let hostname = this.getHostname(url);

    // Use the entire URL if hostname is not valid (like about:debugging)
    if (!hostname || hostname === "") {
      hostname = url;
    }
    return hostname;
  },

  /**
   * Extracts the hostname from a given URL.
   * @param {string} url - The URL to extract the hostname from.
   * @returns {string|null} - The extracted hostname or null if invalid.
   */
  getHostname(url) {
    const urlObj = new URL(url);
    if (urlObj && urlObj.hostname) {
      return urlObj.hostname;
    }
    return null;
  },

  /**
   * Retrieves the list of Mozilla VPN servers from storage.
   * @returns {Promise<object[]>} - The list of Mozilla VPN servers.
   */
  async getServers() {
    const {mozillaVpnServers} = await browser.storage.local.get([MOZILLA_VPN_SERVERS_KEY]);
    if (mozillaVpnServers) {
      return mozillaVpnServers;
    }
  },

  async getSiteContexts() {
    let siteContexts = await browser.storage.local.get([SITE_CONTEXTS_STORAGE_KEY]);
    if (!siteContexts || Object.keys(siteContexts).length === 0) {
      await browser.storage.local.set({ [SITE_CONTEXTS_STORAGE_KEY]: new Map() });
      siteContexts = await browser.storage.local.get([SITE_CONTEXTS_STORAGE_KEY]);
    }
    return siteContexts; 
  },
}