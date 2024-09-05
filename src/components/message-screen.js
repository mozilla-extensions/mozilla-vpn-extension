/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 import { html, LitElement } from "../vendor/lit-all.min.js";

 
 /**
  * MessageScreen
  *
  */
 
 export class MessageScreen extends LitElement {
   static properties = {
        titleHeader: { type: String },
        heading: { type: String },
        body: { type: String },
        primaryAction: { type: String },
        onPrimaryAction: { type: Function },
        secondarAction: {type: String},
        onPrimaryAction: { type: Function },
   };
   constructor() {
     super();
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
        <vpn-titlebar .title=${titleHeader} ></vpn-titlebar>
     `;
   }
 }
customElements.define("message-screen", MessageScreen);


const makePrefabScreen = (
    tag,
    titleHeader,
    heading,
    body,
    primaryAction,
    onPrimaryAction,
    secondarAction,
)=>{
    class Temp extends MessageScreen{
        connectedCallback(){
            super.connectedCallback();
            this.titleHeader = titleHeader
            this.heading = heading
            this.body= body
            this.primaryAction = primaryAction
            this.onPrimaryAction = onPrimaryAction
            this.secondarAction = secondarAction
        }
    }
    customElements.define(tag, Temp);
}


 