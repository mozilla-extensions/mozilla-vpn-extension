/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 import { Component } from "./component.js";
 import { Logger } from "./logger.js";
 import { Utils } from "./utils.js";
 import { VPNController, VPNState } from "./vpncontroller/index.js";

 
 /**
  * SidebarHandler collects and
  * provides various bits of state needed by the UI to show
  * the origin of the current active tab and any
  * associated context (proxy info) if it exists.
  */
 export class SidebarHandler extends Component {
   currentPort;
 
   /**
    *
    * @param {*} receiver
    * @param {VPNController} controller
    */
   constructor(receiver, controller, proxyHandler) {
     super(receiver);
     this.controller = controller;
     this.proxyHandler = proxyHandler;
   }
 
   /** @type {VPNState | undefined} */
   controllerState;
 
   siteContexts;
   currentHostname;
   currentContext;
 
   async init() {
     this.controller.state.subscribe(async(s) => {
       this.controllerState = s;
       if (this.currentPort && this.currentPort.name === "sidebar") {
         this.sendDataToCurrentPopup();
       }
     });
 
     this.proxyHandler.siteContexts.subscribe(async(siteContexts) => {
       this.siteContexts = siteContexts;
       if (this.currentPort && this.currentPort.name === "sidebar") {
         this.sendDataToCurrentPopup();
       }
     });
 
     const currentTab = await Utils.getCurrentTab();
     this.currentHostname = Utils.getFormattedHostname(currentTab.url);
     this.currentContext = this.siteContexts.get(this.currentHostname);
 
     const updateState = async() => {

      const currentTab = await Utils.getCurrentTab();
      this.currentHostname = Utils.getFormattedHostname(currentTab.url);
      this.currentContext = this.siteContexts.get(this.currentHostname);
      this.sendDataToCurrentPopup();
     };

     browser.windows.onFocusChanged.addListener(updateState);
     browser.tabs.onUpdated.addListener(updateState);
     browser.tabs.onActivated.addListener(updateState);
     browser.runtime.onConnect.addListener(async (port) => {
       await this.portConnected(port);
     });
   }

   portConnected(port) {
     this.currentPort = port;


     port.onMessage.addListener((e) => {
      port.postMessage({
        type: "tabInfo",
        currentHostname: this.currentHostname,
        siteContexts: this.siteContexts,
        servers: this.controllerState.servers,
        currentContext: this.currentContext,
        clientState: this.controllerState.state
      });
     });
 
     port.onDisconnect.addListener(() => {
       this.currentPort = null;
     });
 
     if (port.name === "sidebar") {
       return this.sendDataToCurrentPopup();
     }
   }
 
   sendDataToCurrentPopup() {
     return this.currentPort.postMessage({
       type: "tabInfo",
       currentHostname: this.currentHostname,
       siteContexts: this.siteContexts,
       servers: this.controllerState.servers,
       currentContext: this.currentContext,
       clientState: this.controllerState.state
     });
   }
 }
 