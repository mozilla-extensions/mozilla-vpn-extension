/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { propertySum } from "../../shared/property.js";
import { Utils } from "../../shared/utils.js";
import { vpnController, onboardingController, telemetry } from "./backend.js";
import { NUMBER_OF_ONBOARDING_PAGES } from "../../background/onboarding.js";
import { LitElement, html } from "../../vendor/lit-all.min.js";

export class PopUpConditionalView extends LitElement {
  static properties = {
    targetElement: { type: Object },
  };
  createRenderRoot() {
    return this;
  }

  render() {
    return this.targetElement;
  }

  onBoadingScreens = [
    html`<onboarding-screen-1></onboarding-screen-1>`,
    html`<onboarding-screen-2></onboarding-screen-2>`,
    html`<onboarding-screen-3></onboarding-screen-3>`,
  ];

  async connectedCallback() {
    super.connectedCallback();
    const deviceOs = await browser.runtime.getPlatformInfo();
    const supportedPlatform = Utils.isSupportedOs(deviceOs.os);

    propertySum(
      (state, features, currentPage) => {
        this.targetElement = PopUpConditionalView.toSlotname(
          state,
          features,
          supportedPlatform,
          currentPage,
          this.onBoadingScreens
        );
      },
      vpnController.state,
      vpnController.featureList,
      onboardingController.currentOnboardingPage
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
  static toSlotname(
    state,
    features,
    supportedPlatform,
    currentOnboardingPage,
    onBoardingScreens
  ) {
    if (!supportedPlatform && !features.webExtension) {
      return html`<unsupported-os-message-screen></unsupported-os-message-screen>`;
    }
    if (!state.installed) {
      return html`<install-message-screen></install-message-screen>`;
    }
    if (state.needsUpdate) {
      return html`<needs-update-message-screen></needs-update-message-screen>`;
    }
    if (!state.alive) {
      return html`<open-mozilla-vpn-message-screen></open-mozilla-vpn-message-screen>`;
    }
    if (!state.authenticated) {
      return html`<signin-message-screen></signin-message-screen>`;
    }
    if (!state.subscribed) {
      return html`<subscribenow-message-screen></subscribenow-message-screen>`;
    }
    if (
      currentOnboardingPage >= 1 &&
      currentOnboardingPage <= NUMBER_OF_ONBOARDING_PAGES
    ) {
      return onBoardingScreens[currentOnboardingPage];
    }

    return html`<popup-browseraction></popup-browseraction>`;
  }
}
customElements.define("popup-condview", PopUpConditionalView);
