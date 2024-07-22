/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Logger } from "./logger.js";
import { ProxyHandler } from "./proxyHandler/index.js";
import { RequestHandler } from "./requestHandler.js";
import { TabHandler } from "./tabHandler.js";
import { VPNController } from "./vpncontroller/index.js";

const log = Logger.logger("Main");

class Main {
  #handlingEvent = true;
  #pendingEvents = [];

  observers = new Set();
  vpnController = new VPNController(this);
  logger = new Logger(this);
  proxyHandler = new ProxyHandler(this, this.vpnController);
  requestHandler = new RequestHandler(
    this,
    this.vpnController,
    this.proxyHandler
  );
  tabHandler = new TabHandler(this, this.vpnController, this.proxyHandler);

  async init() {
    log("Hello from the background script!");

    for (let observer of this.observers) {
      await observer.init();
    }

    this.#handlingEvent = false;
    this.#processPendingEvents();
  }

  // In order to avoid race conditions amongst multiple events
  // we process them 1 by 1. If we are already handling an
  // event, we wait until it is concluded.
  async handleEvent(type, data) {
    log(`handling event ${type}`);

    if (this.#handlingEvent) {
      log(`Queuing event ${type}`);
      await new Promise((resolve) => this.#pendingEvents.push(resolve));
      log(`Event ${type} resumed`);
    }

    this.#handlingEvent = true;

    const returnValues = [];

    for (const observer of this.observers) {
      try {
        const result = observer.handleEvent(type, data);
        if (result !== undefined) {
          returnValues.push(result);
        }
      } catch (e) {}
    }

    this.#handlingEvent = false;
    this.#processPendingEvents();

    return returnValues;
  }

  #processPendingEvents() {
    if (this.#pendingEvents.length) {
      log(`Processing the first of ${this.#pendingEvents.length} events`);
      this.#pendingEvents.shift()();
    }
  }

  registerObserver(observer) {
    this.observers.add(observer);
  }
}

const main = new Main();
main.init();
globalThis["main"] = main;

// Just do this for debugging
// chrome.browserAction.openPopup();
