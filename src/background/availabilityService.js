/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { Component } from "./component.js";
import { PropertyType } from "../shared/ipc.js";

import { property, WritableProperty } from "../shared/property.js";
import { VPNController } from "./vpncontroller/vpncontroller.js";

/**
 *
 * AvailabilityService reports if a user will be able to
 * create a subscription in at the current location.
 */

export class AvailabilityService extends Component {
  // Gets exposed to UI
  static properties = {
    isAvailable: PropertyType.Bindable,
    check: PropertyType.Function,
    waitlistURL: PropertyType.Bindable,
    ignore: PropertyType.Function,
  };

  /** @type {WritableProperty<String>} */
  // Availability status:
  // Valid Strings: "pending, available, unavailable, ignored"
  isAvailable = property("pending");
  /** @type {WritableProperty<String>} */
  waitlistURL = property("");

  ignore() {
    this.isAvailable.value = "ignored";
  }

  async check() {
    try {
      const htmlString = await fetch("https://www.mozilla.org/products/vpn/", {
        cache: "reload",
      })
        .then((response) => response.text())
        .then((s) => s);

      const res = AvailabilityService.checkContent(htmlString);
      this.isAvailable.propose(res.available);
      if (res.waitlistURL) {
        this.waitlistURL.propose(res.waitlistURL);
      } else {
        this.waitlistURL.propose("");
      }
      return res;
    } catch (error) {
      console.error("Error fetching or parsing the HTML:", error);
    }
  }

  /**
   *
   * @param {*} receiver
   * @param {VPNController} controller
   */
  constructor(receiver, controller) {
    controller.state.subscribe((state) => {
      // We already checked if the vpn is available for the user.
      if (this.isAvailable.value != "pending") {
        return;
      }
      /**
       * Check if the VPN is available when
       * the user has not yet installed the vpn
       * or if the user has not yet subscribed.
       */
      if (state.installed && state.subscribed) {
        return;
      }
      this.check();
    });
    super(receiver);
  }

  static checkContent(html = "") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    /** @type {HTMLAnchorElement?} */
    const waitlistbutton = doc.querySelector(
      `[data-testid="join-waitlist-hero-button"]`
    );
    const available = !!waitlistbutton ? "unavailable" : "available";

    if (!waitlistbutton) {
      return {
        available,
      };
    }
    const buttonURL = new URL(waitlistbutton.href);
    const realURL = new URL("https://www.mozilla.org/");
    realURL.pathname = buttonURL.pathname;

    return {
      available,
      waitlistURL: realURL.toString(),
    };
  }
}
