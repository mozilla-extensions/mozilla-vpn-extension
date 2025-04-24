/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { Component } from "./component.js";
import { PropertyType } from "../shared/ipc.js";

import { IBindable, property, propertySum } from "../shared/property.js";
import { VPNController } from "./vpncontroller/vpncontroller.js";
import { ConflictObserver } from "./conflictObserver.js";
import { ExtensionPBMController } from "./extensionController/extensionPBMController.js";

/**
 *
 * ButterBarService manages 'Butter Bar' alerts shown
 * in the UI.
 */

export class ButterBarService extends Component {
  // Gets exposed to UI
  static properties = {
    butterBarList: PropertyType.Bindable,
    dismissAlert: PropertyType.Function,
  };

  /** @type {IBindable<Array<ButterBarAlert>>} */
  // List of alerts passed to the UI
  butterBarList = property([]);

  /** @type {Array<String>} */
  // List of alert IDs that have been dismissed
  dismissedAlerts = [];

  /**
   *
   * @param {*} receiver
   * @param {VPNController} vpnController
   * @param {ConflictObserver} conflictObserver
   * @param {ExtensionPBMController} extPBMController
   */
  constructor(receiver, vpnController, conflictObserver, extPBMController) {
    super(receiver);
    this.vpnController = vpnController;
    this.conflictObserver = conflictObserver;
    this.extPBMController = extPBMController;
  }

  async init() {
    console.log("Initializing ButterBarService");

    // Load dismissed alerts from browser.storage.local
    const storedDismissedAlerts = await this.loadDismissedAlerts();
    if (storedDismissedAlerts) {
      this.dismissedAlerts = storedDismissedAlerts;
    }

    await this.conflictObserver.updateList();

    this.vpnController.interventions.subscribe((interventions) => {
      const alert = new ButterBarAlert(
        "conflictingProgram",
        "alert_conflictingProgram",
        "howToFix",
        "https://support.mozilla.org/kb/program-your-computer-interferes-mozilla-vpn-exten?utm_medium=mozilla-vpn&utm_source=vpn-extension"
      );
      if (interventions.length == 0) {
        this.removeAlert(alert.alertId);
        return;
      }
      this.maybeCreateAlert(alert);
    });

    this.conflictObserver.conflictingAddons.subscribe((conflictingAddons) => {
      const alert = new ButterBarAlert(
        "alert_conflictingExtensions",
        "alert_conflictingExtensions",
        "learnWhatToDo",
        "https://support.mozilla.org/kb/if-another-extension-interferes-mozilla-vpn?utm_medium=mozilla-vpn&utm_source=vpn-extension"
      );
      if (conflictingAddons.length == 0) {
        this.removeAlert(alert.alertId);
        return;
      }

      this.maybeCreateAlert(alert);
    });

    this.extPBMController.autoConnect.subscribe(async (isEnabled) => {
      const alert = new ButterBarAlert(
        "alertPbmPermissionRequired",
        "alertPbmPermissionRequired",
        "howToFix",
        "https://youtu.be/dQw4w9WgXcQ?t=0"
      );
      if (!isEnabled || (await browser.extension.isAllowedIncognitoAccess())) {
        this.removeAlert(alert.alertId);
        return;
      }
      this.maybeCreateAlert(alert);
    });
  }

  /**
   * Load dismissed alerts from browser.storage.local
   * @returns {Promise<Array<String>>}
   */
  loadDismissedAlerts() {
    return new Promise((resolve) => {
      browser.storage.local.get("dismissedAlerts").then((result) => {
        resolve(result.dismissedAlerts || []);
      });
    });
  }

  /**
   * @param {ButterBarAlert} alert
   */
  maybeCreateAlert(alert) {
    const { alertId } = alert;
    const alertInButterBarList = this.alertInButterBarList(
      alertId,
      this.butterBarList.value
    );
    if (
      this.alertWasDismissed(alertId, this.dismissedAlerts) ||
      this.alertInButterBarList(alertId, this.butterBarList.value)
    ) {
      return;
    }
    this.butterBarList.set([...this.butterBarList.value, alert]);
    return;
  }
  /**
   * @param {string} id
   * @param {Array} dismissedAlerts
   */
  alertWasDismissed(id, dismissedAlerts) {
    return dismissedAlerts.some((alertId) => alertId == id);
  }

  /**
   * @param {string} id
   * @param {Array} butterBarList
   */
  alertInButterBarList(id, butterBarList) {
    return butterBarList.some((alert) => alert.alertId == id);
  }

  // Called from the UI when a user has dismissed the butter bar
  async dismissAlert(id) {
    const newAlertList = this.butterBarList.value.filter(
      ({ alertId }) => alertId !== id
    );
    this.dismissedAlerts.push(id);

    // Save the updated dismissedAlerts to browser.storage.local
    await this.saveDismissedAlerts(this.dismissedAlerts);

    this.butterBarList.set(newAlertList);
    return;
  }

  /**
   * Save dismissed alerts to browser.storage.local
   * @param {Array<String>} dismissedAlerts
   */
  async saveDismissedAlerts(dismissedAlerts) {
    await browser.storage.local.set({ dismissedAlerts });
  }

  // Removes an alert from the butter bar list without adding
  // it to the list of dismissed alerts.
  removeAlert(id) {
    const newAlertList = this.butterBarList.value.filter(
      ({ alertId }) => alertId !== id
    );
    this.butterBarList.set([...newAlertList]);
    return;
  }
}

export class ButterBarAlert {
  /**
   * @param {string} alertId
   * @param {string} alertMessage
   * @param {string} linkText
   * @param {string} linkUrl
   */
  constructor(alertId, alertMessage, linkText, linkUrl) {
    (this.alertId = alertId),
      (this.alertMessage = alertMessage),
      (this.linkText = linkText),
      (this.linkUrl = linkUrl);
  }
}
