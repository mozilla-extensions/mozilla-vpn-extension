/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PropertyType } from "../shared/ipc.js";
import { computed, IBindable, property } from "../shared/property.js";
import { ExtensionController } from "./extensionController/extensionController.js";
import { ProxyHandler } from "./proxyHandler/proxyHandler.js";
import { SiteContext } from "./proxyHandler/siteContext.js";
import { VPNController } from "./vpncontroller/vpncontroller.js";

//@ts-check

/**
 * ConflictCheck checks for
 */
export class Telemetry {
  // Things to expose to the UI
  static properties = {
    setTelemetryEnabled: PropertyType.Function,
    record: PropertyType.Function,
  };
  /**  @type { IBindable<Boolean>}*/
  telemetryEnabled = property(false);

  /**
   * @param {VPNController} controller
   * @param {ExtensionController} extensionController
   * @param {ProxyHandler} proxyHandler
   */
  constructor(controller, extensionController, proxyHandler) {
    this.#controller = controller;
    this.telemetryEnabled = computed(controller.settings, (vpnSettings) => {
      return vpnSettings.extensionTelemetryEnabled;
    });
    extensionController.state.subscribe((state) => {
      if (state.enabled == this.#enabled) {
        return;
      }
      this.#enabled = state.enabled;
      this.#enabled ? this.startSession() : this.stopSession();
    });
    proxyHandler.siteContexts.subscribe((ctxMap) => {
      const counts = Telemetry.evaluateSiteContexts(ctxMap);
      this.record("count_excluded", counts.excluded);
      this.record("count_geoprefed", counts.geoPrefed);
    });
  }
  setTelemetryEnabled(enabled) {
    this.#controller.sendMessage("settings", {
      extensionTelemetryEnabled: enabled,
    });
  }
  record(eventName = "", data) {
    if (!this.telemetryEnabled.value) {
      // Don't send telemetry, unless we're sure we're enabled.
      return;
    }
    if (eventName == "") {
      return;
    }
    this.#controller.sendMessage("telemetry", {
      name: eventName,
      args: data,
    });
  }
  startSession() {
    this.#controller.sendMessage("start_session");
  }
  stopSession() {
    this.#controller.sendMessage("stop_session");
  }

  #controller;
  #enabled = false;

  /**
   * Consumes a size Context Map and returns how many pages
   * are either geopreffed to a location  and how many are excluded
   * @param {Map<string,SiteContext>} contextMap
   */
  static evaluateSiteContexts(contextMap) {
    const v = contextMap.values();
    return v.reduce(
      (acc, curr) => {
        curr.excluded ? acc.excluded++ : acc.geoPrefed++;
        return acc;
      },
      {
        excluded: 0,
        geoPrefed: 0,
      }
    );
  }
}
