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

  // List of unresolved 'butter bar' alerts to be shown in the UI
  get butterBarList() {
    return this.#mButterBarList;
  }

  #mButterBarList = property([]);

  constructor(receiver, vpnController, conflictObserver) {
    super(receiver);
    this.vpnController = vpnController;
    this.conflictObserver = conflictObserver;
  }

  // List of alert IDs that have been dismissed
  dismissedAlerts = [];

  async init() {
    console.log("Initializing ButterBarService");

    this.vpnController.state.subscribe((s) => {
      this.controllerState = s;
      // Check for interventions
      // if interventions...
      this.#mButterBarList.value.push(
        new ButterBarAlert(
          "conflictingProgram",
          "alert_conflictingProgram",
          "howToFix",
          "https://sumo.mozilla.org"
        )
      );
    });

    this.conflictObserver.conflictingAddons.subscribe((conflictingAddons) => {
      const id = "conflicting-addons";
      // The conflict observer provides a list of installed addons that leverage the proxy
      // permission. This includes the Mozilla VPN extension. If the list of conflicting addons
      // is 1, it is our extension.
      if (
        conflictingAddons.length <= 1 ||
        this.dismissedAlerts.find((alertId) => alertId == id)
      ) {
        console.log(
          "No conflicting addons found or alert already dismissed. No butter bar alert necessary."
        );
        return;
      }

      this.#mButterBarList.value.push(
        new ButterBarAlert(
          id,
          "alert_conflictingExtensions",
          "learnWhatToDo",
          "https://sumo.mozilla.org"
        )
      );
    });
  }

  removeAlert(id) {
    const newAlertList = this.#mButterBarList.value.filter(
      ({ alertId }) => alertId !== id
    );
    this.dismissedAlerts.push(id);

    this.#mButterBarList.set(newAlertList);
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
