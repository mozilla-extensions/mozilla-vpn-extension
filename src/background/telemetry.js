/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PropertyType } from "../shared/ipc.js";
import {
  computed,
  IBindable,
  property,
  propertySum,
} from "../shared/property.js";
import { ExtensionController } from "./extensionController/extensionController.js";
import { ProxyHandler } from "./proxyHandler/proxyHandler.js";
import { SiteContext } from "./proxyHandler/siteContext.js";
import { VPNController } from "./vpncontroller/vpncontroller.js";
import { Component } from "./component.js";

//@ts-check

/**
 * ConflictCheck checks for
 */
export class Telemetry extends Component {
  // Things to expose to the UI
  static properties = {
    telemetryEnabled: PropertyType.Bindable,
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
  constructor(parent, controller, extensionController, proxyHandler) {
    super(parent);
    browser.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details);
    });

    this.#controller = controller;

    extensionController.state.subscribe((state) => {
      if (state.enabled == this.#enabled) {
        return;
      }
      this.record("fx_protection_mode_changed", {
        message_state: state.name,
      });
      this.#enabled = state.enabled;
      this.#enabled ? this.startSession() : this.stopSession();
    });

    proxyHandler.siteContexts.subscribe((ctxMap) => {
      const counts = Telemetry.evaluateSiteContexts(ctxMap);
      this.record("count_excluded", counts.excluded);
      this.record("count_geoprefed", counts.geoPrefed);
    });
  }
  async init() {
    super.init();

    const { dataCollectionConsent } = await browser.storage.local.get(
      "dataCollectionConsent"
    );
    this.telemetryEnabled.value = dataCollectionConsent || false;

    // Listen for changes to the telemetryEnabled property, save to storage.
    this.telemetryEnabled.subscribe(
      (newValue) => {
        browser.storage.local.set({ dataCollectionConsent: newValue });
      },
      {
        immediate: false,
      }
    );

    // Listen for glean changes on the client side
    const clientTelemetryEnabled = computed(
      this.#controller.settings,
      (vpnSettings) => {
        return vpnSettings.extensionTelemetryEnabled;
      }
    );
    // When they mismatch, we need to update the client setting.
    propertySum(
      (extensionEnabled, clientEnabled) => {
        if (clientEnabled == extensionEnabled) {
          return;
        }
        this.#controller.postToApp("settings", {
          settings: {
            extensionTelemetryEnabled: extensionEnabled,
          },
        });
      },
      this.telemetryEnabled,
      clientTelemetryEnabled
    );
  }

  setTelemetryEnabled(enabled) {
    this.telemetryEnabled.value = enabled;
  }

  record(eventName = "", data) {
    if (!this.telemetryEnabled.value) {
      // Don't send telemetry, unless we're sure we're enabled.
      return;
    }
    if (eventName == "") {
      return;
    }
    this.#controller.postToApp("telemetry", {
      name: eventName,
      args: data,
    });
  }
  startSession() {
    this.#controller.postToApp("session_start");
  }
  stopSession() {
    this.#controller.postToApp("session_stop");
  }

  #controller;
  #enabled = false;

  /**
   * Consumes a size Context Map and returns how many pages
   * are either geopreffed to a location  and how many are excluded
   * @param {Map<string,SiteContext>} contextMap
   */
  static evaluateSiteContexts(contextMap) {
    let v;
    try {
      v = contextMap.values();
    } catch (error) {
      v = Object.values(contextMap);
    }

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

  async onInstalled(
    details = {
      reason: "",
      previousVersion: "",
      temporary: false,
    }
  ) {
    console.log(details);
    if (details.reason == "install" || details.temporary) {
      // This is a fresh install, so we need to show the first run page.
      const url = browser.runtime.getURL("/ui/firstRun/firstRun.html");
      browser.tabs.create({
        url,
      });
      return;
    }
    if (details.reason != "update") {
      return;
    }
    // We did update so let's create an upgrade path.
    // Check 1: We have already a value in storage, no need to migrate!
    const { dataCollectionConsent } = await browser.storage.local.get(
      "dataCollectionConsent"
    );
    if (dataCollectionConsent != undefined) {
      return;
    }
    console.info("Telemetry: Waiting for VPN to be alive");
    // Check 2: Now we need to wait for the VPN to be alive, so we can query it's settings.
    for await (const state of this.#controller.state) {
      if (state.alive) {
        break;
      }
    }
    // Check 3: Now we can query the settings.
    const isEnabled = this.#controller.settings.value.extensionTelemetryEnabled;
    console.info(`Telemetry: VPN is alive, telemetryEnabled: ${isEnabled}`);
    if (isEnabled) {
      // We store in the property, which will also send this into storage.
      // We're done.
      this.telemetryEnabled.value = true;
      return;
    }
    // Now this is the ugly thing.
    // The user may or may not have accepted telemetry in the past.
    // We will move to the new Telemetry-Opt-In System anyway.
    // That means we will need to prompt all users anyway..
    // So for now let's just set the telemetryEnabled to false.
    this.telemetryEnabled.value = false;
  }
}
