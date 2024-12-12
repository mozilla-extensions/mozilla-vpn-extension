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
    removeAlert: PropertyType.Function,
  };

  /** @type {IBindable<Array<ButterBarAlert>>} */
  // List of alerts passed to the UI
  #mButterBarList = property([]);

  /** @type {Array<String>} */
  // List of alert IDs that have been dismissed
  #mDismissedAlerts = [];

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
        "https://sumo.mozilla.org"
      );
      this.maybeCreateAlert(interventions, alert);
    });

    this.conflictObserver.conflictingAddons.subscribe((conflictingAddons) => {
      const alert = new ButterBarAlert(
        "alert_conflictingExtensions",
        "alert_conflictingExtensions",
        "learnWhatToDo",
        "https://sumo.mozilla.org"
      );

      this.maybeCreateAlert(conflictingAddons, alert);
    });
  }
  /**
   * @param {Array} list
   * @param {ButterBarAlert} alert
   */
  maybeCreateAlert(list, alert) {
    if (list.length == 0) {
      return;
    }
    const { alertId } = alert;

    if (this.alertWasDismissed(alertId) || this.alertInButterBarList(alertId)) {
      return;
    }
    return this.#mButterBarList.value.push(alert);
  }

  /**
   * @param {string} id
   */
  alertWasDismissed(id) {
    return this.#mDismissedAlerts.find((alertId) => alertId == id);
  }

  /**
   * @param {string} id
   */
  alertInButterBarList(id) {
    return this.#mButterBarList.value.find((alert) => {
      alert.alertId == id;
    });
  }

  removeAlert(id) {
    const newAlertList = this.#mButterBarList.value.filter(
      ({ alertId }) => alertId !== id
    );
    this.#mDismissedAlerts.push(id);
    return this.#mButterBarList.set(newAlertList);
  }

  get butterBarList() {
    return this.#mButterBarList;
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
