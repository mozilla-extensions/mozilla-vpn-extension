/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ConditionalView } from "../../components/conditional-view.js"
import { vpnController } from "./backend.js";
 
 export class PopUpConditionalView extends ConditionalView {
   constructor() {
     super();
   }

   connectedCallback(){
    super.connectedCallback();
    vpnController.state.subscribe(s => {

    })
   }

   /**
    * @typedef {import("../../background/vpncontroller/states.js").VPNState} State
    * @param {State} state 
    * @returns {String}
    */
   static toSlotname(state){
        if(!state.alive){
            return "MessageStartVPN"
        }
        if(!state.subscribed){
            return "MessageSubscription"
        }
        return "default"

   }
 }
 customElements.define("popup-condview", PopUpConditionalView);
 