/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Logger } from "./logger.js";
import { RequestHandler } from "./requestHandler.js";
import { TabHandler } from "./tabHandler.js";
import { VPNController } from "./vpncontroller/index.js";

const log = Logger.logger("Main");

class Main {
  observers = new Set();
  vpnController = new VPNController(this);
  logger = new Logger(this);
  requestHandlder = new RequestHandler(this, this.vpnController);
  UIHandler = new UIHandler(this);

  async init() {
    log("Hello from the background script!");

    for (let observer of this.observers) {
      await observer.init();
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
