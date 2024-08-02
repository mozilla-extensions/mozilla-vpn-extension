/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "../component.js";
import { VPNState } from "./../vpncontroller/index.js";

import { property } from "../../utils/property.js";

import { 
  ExtensionState,
  StateExtensionOn,
  StateExtensionOff,
  StateExtensionOnPartial,
  StateExtensionOffPartial,
  StateExtensionLoading
} from "./states.js";


export class ExtensionController extends Component {
  #port;
  #mState = property(new ExtensionState(null));

  constructor(receiver, controller) {
    super(receiver);
    this.controller = controller;
  }

  /** @type {VPNState | undefined} */
  controllerState;

  get state() {
    return this.#mState.readOnly;
  }

  async init() {
    this.#mState.value = await ExtensionState.fromStorage();

    this.controller.state.subscribe((s) => {
      this.controllerState = s;
      this.#handleStateChange();
    });

    globalThis.browser.runtime.onConnect.addListener((port) => {
        this.#port = port;
        this.#onPortConnected(port);
    });

    this.#handleStartup();
    browser.runtime.onStartup.addListener(this.#handleStartup);
  }

  #handleStartup() {
    if (!this.controllerState) {
      this.#mState.value = new StateExtensionLoading();
      return;
    }

    switch(this.controllerState.state) {
      case "Disabled":

        this.#mState.value = new StateExtensionOff();
        break;
      case "Enabled":
        this.#mState.value = new StateExtensionOn();
        break;
    }
  }

  #handleStateChange() {
    const controllerState = this.controllerState;

    if (!controllerState) {
      this.#mState.value = new StateExtensionLoading();
      return;
    }
    const currentState = this.#mState.value.state;
    switch(controllerState.state) {
      
      case "Disabled":
        if (currentState === "Off" || currentState == "onPartial") {
          // No state necessary, stay as we are.
          return;
        }
        // Extension is in StateOn or StateOffPartial 
        this.#mState.value = new StateExtensionOff();
        break;
      case "Enabled":
        // Should never get here with the extension in OffPartial
        // but just in case.
        if (currentState == "Off" || currentState == "OffPartial") {
          return this.#mState.value = new StateExtensionOn();
        }
        // Extension is on OnPartial or On, no change needed
        break;
    }
  }

  #onPortConnected(port) {
    queueMicrotask(() => {
      port.postMessage(this.#mState.value);
    });

    port.onDisconnect.addListener(() => {
      this.#port = null;
    });

    port.onMessage.addListener((message) => {
      switch(message.type) {
        case "deactivate-fx":
          if (this.controllerState.state === "Disabled") {
            return this.#mState.value = new StateExtensionOff();
          }
          // Call "deactivate" to client
          this.#mState.value = new StateExtensionOffPartial();
          break;
        case "activate-fx":
          if (this.controllerState.state === "Disabled") {
            // call "activate" to client
            return this.#mState.value = new StateExtensionOnPartial();
          }
          this.#mState.value = new StateExtensionOn();
          break;
      }
    });
  }
}
