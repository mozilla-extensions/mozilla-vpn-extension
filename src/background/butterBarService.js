/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { PropertyType } from "../shared/ipc.js";

import { property } from "../shared/property.js";

export class ButterBarService extends Component {
  // Gets exposed to UI
  static properties = {
    butterBarList: PropertyType.Bindable,
    removeAlert: PropertyType.Function,
  };

  // List of alerts passed to the UI 
  #mButterBarList = property([]);

  // List of alert IDs that have been dismissed
  #mDismissedAlerts = [];

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

  maybeCreateAlert(list, alert) {
    if (list.length == 0) {
      return;
    }
    const { alertId } = alert;

    if (this.alertWasDismissed(alertId) || this.alertInButterBarList(alertId)) {
      return;
    }
    this.#mButterBarList.value.push(alert);
  }

  alertWasDismissed(id) {
    return this.#mDismissedAlerts.find((alertId) => alertId == id);
  }

  alertInButterBarList(id) {
    return this.#mButterBarList.value.find((alert) => {alert.alertId == id});
  }

  removeAlert(id) {
    const newAlertList = this.#mButterBarList.value.filter(
      ({ alertId }) => alertId !== id
    );
    this.#mDismissedAlerts.push(id);

    this.#mButterBarList.set(newAlertList);
  }

  get butterBarList() {
    return this.#mButterBarList;
  }
}

export class ButterBarAlert {
  constructor(alertId, alertMessage, linkText, linkUrl) {
    (this.alertId = alertId),
      (this.alertMessage = alertMessage),
      (this.linkText = linkText),
      (this.linkUrl = linkUrl);
  }
}
