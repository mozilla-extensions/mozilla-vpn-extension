/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Logger} from "./logger.js";
import {RequestHandler} from "./requestHandler.js";

const log = Logger.logger("Main");

class Main {
  constructor() {
    this.observers = new Set();

    this.logger = new Logger(this);
    this.requestHandlder = new RequestHandler(this);
  }

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