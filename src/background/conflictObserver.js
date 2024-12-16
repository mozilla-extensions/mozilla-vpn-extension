/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PropertyType } from "../shared/ipc.js";
import { IBindable, property } from "../shared/property.js";

//@ts-check

/**
 * ConflictCheck checks for
 */
export class ConflictObserver {
  // Things to expose to the UI
  static properties = {
    conflictingAddons: PropertyType.Bindable,
  };
  /**  @type { IBindable<Array<browser.management.ExtensionInfo>>}*/
  conflictingAddons = property([]);

  constructor() {
    this.updateList();

    browser.management.onInstalled.addListener(this.updateList.bind(this));
    browser.management.onUninstalled.addListener(this.updateList.bind(this));
    browser.management.onEnabled.addListener(this.updateList.bind(this));
    browser.management.onDisabled.addListener(this.updateList.bind(this));
  }

  async updateList() {
    /**  @type { Promise<Array<browser.management.ExtensionInfo>>}*/
    const addonRequest = browser.management.getAll();
    try {
      const installedAddons = await addonRequest;

      const newConflictAddons = installedAddons.filter(
        ConflictObserver.isConflicting
      );
      this.conflictingAddons.value = newConflictAddons;
    } catch (error) {}
  }

  /**
   * Checks if an Extension can interfere with the VPN-Extension
   * @param {browser.management.ExtensionInfo} addon
   * @returns {boolean}
   */
  static isConflicting(addon) {
    return (
      addon.enabled &&
      addon.permissions.includes("proxy") &&
      addon.id !== "vpn@mozilla.com"
    );
  }
}
