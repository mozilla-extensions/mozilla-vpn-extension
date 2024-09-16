/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ConditionalView } from "../../components/conditional-view.js";
import { vpnController } from "./backend.js";

export class PopUpConditionalView extends ConditionalView {
  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    vpnController.state.subscribe((s) => {
      this.slotName = PopUpConditionalView.toSlotname(s);
    });
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
   * @typedef {import("../../background/vpncontroller/states.js").VPNState} State
   * @param {State} state
   * @returns {String}
   */
  static toSlotname(state) {
    if (!state.installed) {
      return "MessageInstallVPN";
    }
    if (!state.alive) {
      return "MessageStartVPN";
    }
    if (!state.authenticated) {
      return "MessageSignIn";
    }
    if (!state.subscribed) {
      return "MessageSubscription";
    }
    /**
     * TODO:
     * if( did not have onboarding){
     *  return "onBoarding"
     * }
     */
    return "default";
  }
}
customElements.define("popup-condview", PopUpConditionalView);
