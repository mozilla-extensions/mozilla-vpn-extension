/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { Component } from "./component.js";
import { PropertyType } from "../shared/ipc.js";

import { IBindable, property, WritableProperty } from "../shared/property.js";
import { VPNController } from "./vpncontroller/vpncontroller.js";
import { VPNState } from "./vpncontroller/states.js";

/**
 *
 * ButterBarService manages 'Butter Bar' alerts shown
 * in the UI.
 */

export class AvailablityService extends Component {
  // Gets exposed to UI
  static properties = {
    isAvailable: PropertyType.Bindable,
    check: PropertyType.Function,
    waitlistURL: PropertyType.Bindable,
    ignore: PropertyType.Function,
  };

  /** @type {WritableProperty<String>} */
  // Availablity status: 
  // Valid Strings: "pending, available, unavailable, ignored"
  isAvailable = property("pending");
  /** @type {WritableProperty<String>} */
  waitlistURL = property("");

  async ignore(){
    this.isAvailable.value = "ignored";
  }

  async check(){
    return await fetch('https://www.mozilla.org/products/vpn/', { cache: "reload" })
        .then(response => response.text())
        .then(htmlString => {
            // Parse the HTML string into a document
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            
            // Now you can use querySelector on the parsed document
            /** @type {HTMLAnchorElement?} */
            const waitlistbutton = doc.querySelector(`[data-testid="join-waitlist-hero-button"]`);
            const available = !!waitlistbutton ? "unavailable" : "available";
            
           
            if(waitlistbutton){
                const buttonURL = new URL( waitlistbutton.href);
                const realURL = new URL("https://www.mozilla.org/")
                realURL.pathname = buttonURL.pathname;
                this.waitlistURL.value = realURL.toString();
            }
            console.log(`A vpn subscribtion is: ${available}, waitlist ${this.waitlistURL.value}`);

            this.isAvailable.value = available;
            return available; 
        })
        .catch(error => {
            console.error('Error fetching or parsing the HTML:', error);
        });
  }

  /**
   * 
   * @param {*} receiver 
   * @param {VPNController} controller 
   */
  constructor(receiver, controller) {
    controller.state.subscribe(state =>{
        // We already checked if the vpn is available for the user.
        if(this.isAvailable.value != "pending"){
            return;
        }
        /**
         * Check if the VPN is available when 
         * the user has not yet installed the vpn 
         * or if the user has not yet subscribed.
         */
        if(!state.installed){
            this.check();
            return;
        }
        if(!state.subscribed){
            this.check();
            return;
        }
    })
    super(receiver);
  }

  async init() {}
}
