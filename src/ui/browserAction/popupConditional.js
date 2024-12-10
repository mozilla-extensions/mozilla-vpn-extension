/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ConditionalView } from "../../components/conditional-view.js";
import { propertySumTrio } from "../../shared/property.js";
import { Utils } from "../../shared/utils.js";
import { vpnController, extController } from "./backend.js";

export class PopUpConditionalView extends ConditionalView {
  constructor() {
    super();
  }

  async connectedCallback() {
    super.connectedCallback();
    const deviceOs = await browser.runtime.getPlatformInfo();
    const supportedPlatform = Utils.isSupportedOs(deviceOs.os);

    propertySumTrio(
      vpnController.state,
      vpnController.featureList,
      extController.currentOnboardingPage,
      (state, features, currentPage) => {
        this.slotName = PopUpConditionalView.toSlotname(
          state,
          features,
          supportedPlatform,
          currentPage
        );
      }
    );

    // Messages may dispatch an event requesting to send a Command to the VPN
    this.addEventListener("requestMessage", (e) => {
      console.log(`Message requested ${e}`);
      if (!e.detail) {
        return;
      }
      if (typeof e.detail != "string") {
        return;
      }
      vpnController.postToApp(e.detail);
    });
  }

  /**
   * @typedef {import("../../background/vpncontroller/vpncontroller.js").FeatureFlags} FeatureFlags
   * @typedef {import("../../background/vpncontroller/states.js").VPNState} State
   * @param {State} state
   * @param {FeatureFlags} features
   * @param {Boolean} supportedPlatform
   * @param {Number} currentOnboardingPage
   * @returns {String}
   */
  static toSlotname(state, features, supportedPlatform, currentOnboardingPage) {
    if (!supportedPlatform && !features.webExtension) {
      return "MessageOSNotSupported";
    }
    if (!state.installed) {
      return "MessageInstallVPN";
    }
    if (state.needsUpdate) {
      return "MessageUpdateClient";
    }
    if (!state.alive) {
      return "MessageOpenMozillaVPN";
    }
    if (!features.webExtension) {
      return "MessageOSNotSupported";
    }
    if (!state.authenticated) {
      return "MessageSignIn";
    }
    if (!state.subscribed) {
      return "MessageSubscription";
    }
    if (currentOnboardingPage == 1) {
      return "onboarding-1"
    }
    if (currentOnboardingPage == 2) {
      return "onboarding-2"
    }
    if (currentOnboardingPage == 3) {
      return "onboarding-3"
    }

    return "default";
  }
}
customElements.define("popup-condview", PopUpConditionalView);
