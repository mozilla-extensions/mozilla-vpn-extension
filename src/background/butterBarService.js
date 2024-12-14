/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { Component } from "./component.js";
import { PropertyType } from "../shared/ipc.js";

import { IBindable, property } from "../shared/property.js";
import { VPNController } from "./vpncontroller/vpncontroller.js";
import { ConflictObserver } from "./conflictObserver.js";

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
   */
  constructor(receiver, vpnController, conflictObserver) {
    super(receiver);
    this.vpnController = vpnController;
    this.conflictObserver = conflictObserver;
  }

  async init() {
    console.log("Initializing ButterBarService");
    await this.conflictObserver.updateList();

    this.vpnController.interventions.subscribe((interventions) => {
      const alert = new ButterBarAlert(
        "conflictingProgram",
        "alert_conflictingProgram",
        "howToFix",
        "https://support.mozilla.org/kb/program-your-computer-interferes-mozilla-vpn-exten?utm_medium=mozilla-vpn&utm_source=vpn-extension"
      );
      this.maybeCreateAlert(interventions, alert);
    });

    this.conflictObserver.conflictingAddons.subscribe((conflictingAddons) => {
      const alert = new ButterBarAlert(
        "alert_conflictingExtensions",
        "alert_conflictingExtensions",
        "learnWhatToDo",
        "https://support.mozilla.org/kb/if-another-extension-interferes-mozilla-vpn?utm_medium=mozilla-vpn&utm_source=vpn-extension"
      );

      this.maybeCreateAlert(conflictingAddons, alert);
    });
  }
  /**
   * @param {Array} list
   * @param {ButterBarAlert} alert
   */
  maybeCreateAlert(list, alert) {
    const { alertId } = alert;
    const alertInButterBarList = this.alertInButterBarList(
      alertId,
      this.butterBarList.value
    );

    if (list.length == 0) {
      if (!alertInButterBarList) {
        return;
      }

      this.removeAlert(alertId);
      return;
    }

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
  dismissAlert(id) {
    const newAlertList = this.butterBarList.value.filter(
      ({ alertId }) => alertId !== id
    );
    this.dismissedAlerts.push(id);
    this.butterBarList.set(newAlertList);
    return;
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
