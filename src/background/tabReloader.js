/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Utils } from "../shared/utils.js";
import { Component } from "./component.js";
import { ProxyHandler } from "./proxyHandler/proxyHandler.js";
import { ExtensionController } from "./extensionController/extensionController.js";

/**
 * This Class Listens to Changes to the ProxyHandler.SiteContext
 * rules and changes to the extension state.
 * It will query the Open tabs and either Reload or Discard the
 * Tab to make sure the new SiteContext or ExtensionState is respected.
 *
 * Impacted tabs that are not Active will be discarded
 * so that the next time the user opens the Tab we will reload it
 *
 * Active Tabs will be reloaded instantly.
 *
 * Tabs that play Audio/Video i.e a Zoom Call, Youtube Video etc
 * will not be reloaded/discarded.
 *
 */
export class TabReloader extends Component {
  /**
   *
   * @param {*} receiver
   * @param {ExtensionController} extController
   * @param {ProxyHandler} proxyHandler
   */
  constructor(receiver, extController, proxyHandler) {
    super(receiver);
    this.proxyHandler = proxyHandler;
    this.extController = extController;
  }

  async init() {
    this.proxyHandler.lastChangedOrigin.subscribe(TabReloader.onOriginChanged);
    this.extController.state.subscribe((s) => {
      TabReloader.onExtensionStateChanged(s);
    });
  }

  currentExtState;

  static async onExtensionStateChanged(extState) {
    if (
      this.currentExtState == extState.state ||
      !["Enabled", "Disabled"].includes(extState.state)
    ) {
      return;
    }
    this.currentExtState = extState.state;
    TabReloader.onOriginChanged();
  }

  static async onOriginChanged(origin = null) {
    const loadedTabs = await browser.tabs.query({
      // If discarded, the next activation will reload it anyway.
      discarded: false,
    });
    const relevantTabs = origin
      ? loadedTabs.filter(TabReloader.matches(origin))
      : loadedTabs;
    if (relevantTabs.length == 0) {
      return;
    }
    relevantTabs.filter(TabReloader.needsDiscard).forEach((tab) => {
      browser.tabs.discard(tab.id);
    });
    relevantTabs.filter(TabReloader.needsReload).forEach((tab) => {
      browser.tabs.reload(tab.id);
    });
  }

  /**
   * Checks if a tab matches an hostname
   * @param {String} hostname - The hostname
   * @returns {($1:browser.tabs.Tab)=>boolean} - A filter function checking tab hostname
   */
  static matches(hostname = "") {
    /**
     * @param {browser.tabs.Tab} tab
     * @returns {boolean}
     */
    return (tab) => {
      if (hostname === "") {
        return false;
      }
      const tabURL = Utils.getFormattedHostname(tab.url);
      return tabURL === hostname;
    };
  }

  /**
   * Returns true if the Tab Should be discarded if
   * the SiteContext Rule for the Tab Changes
   * @param {browser.tabs.Tab} tab - The Tab to check
   * @returns {Boolean}
   */
  static needsDiscard(tab) {
    return !tab.discarded && !tab.audible && !tab.active;
  }
  /**
   * Returns true if the Tab Should be Reloaded if
   * the SiteContext Rule for the Tab Changes
   * @param {browser.tabs.Tab} tab - The Tab to check
   * @returns {Boolean}
   */
  static needsReload(tab) {
    return tab.active && !tab.audible && !tab.discarded;
  }
}
