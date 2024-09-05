/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 import { html, LitElement } from "../vendor/lit-all.min.js";

 
 /**
  * `ConditionalView`
  *
  */
 
 export class ConditionalView extends LitElement {
   static properties = {
     slotName: { attribute: true },
   };
   constructor() {
     super();
     this.slotName = "default"
   }

   hasSlot(slotName){
    return Array.from(this.children).some(e =>{
        e.slot === slotName;
    })
   }
   getTargetSlot(){
    let slot = this.slotName;
    if(slot == ""){
        return "default";
    }
    if(!this.hasSlot(slot)){
        return "default"
    }
    return slot;
   }
   render() {
     return html`
       <slot name=${this.getTargetSlot()}></slot>
     `;
   }
 }
 customElements.define("conditional-view", ConditionalView);
 