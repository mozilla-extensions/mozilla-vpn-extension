/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Logger } from "./logger.js";
import { ProxyHandler } from "./proxyHandler/index.js";
import { RequestHandler } from "./requestHandler.js";
import { TabHandler } from "./tabHandler.js";
import { ToolbarIconHandler } from "./toolbarIconHandler.js";

import { VPNController } from "./vpncontroller/index.js";
import {
  ExtensionController,
  ExtensionPBMController,
} from "./extensionController/index.js";
import { OnboardingController } from "./onboarding.js";

import { expose } from "../shared/ipc.js";
import { TabReloader } from "./tabReloader.js";
import { ConflictObserver } from "./conflictObserver.js";
import { ButterBarService } from "./butterBarService.js";
import { Telemetry } from "./telemetry.js";
import { AvailabilityService } from "./availabilityService.js";

const log = Logger.logger("Main");

class Main {
  #handlingEvent = true;
  #pendingEvents = [];

  observers = new Set();
  conflictObserver = new ConflictObserver();
  vpnController = new VPNController(this);
  extController = new ExtensionController(this, this.vpnController);
  extPBMController = new ExtensionPBMController(
    this,
    this.vpnController,
    this.extController
  );
  onboardingController = new OnboardingController(this);
  logger = new Logger(this);
  proxyHandler = new ProxyHandler(this, this.vpnController);
  requestHandler = new RequestHandler(
    this,
    this.extController,
    this.proxyHandler,
    {
      incognito: false,
    }
  );

  pbmRequestHandler = new RequestHandler(
    this,
    this.extPBMController,
    this.proxyHandler,
    {
      incognito: true,
    }
  );

  telemetry = new Telemetry(
    this.vpnController,
    this.extController,
    this.proxyHandler
  );
  tabHandler = new TabHandler(
    this,
    this.extController,
    this.proxyHandler,
    this.vpnController
  );
  toolbarIconHandler = new ToolbarIconHandler(
    this,
    this.extController,
    this.vpnController,
    this.extPBMController
  );
  tabReloader = new TabReloader(this, this.extController, this.proxyHandler);
  butterBarService = new ButterBarService(
    this,
    this.vpnController,
    this.conflictObserver,
    this.extPBMController
  );
  availabilityService = new AvailabilityService(this, this.vpnController);

  async init() {
    log("Hello from the background script!");

    const init_done = Promise.all(
      this.observers
        .values()
        .map((observer) => observer.init())
        .toArray()
    );

    expose(this.vpnController);
    expose(this.extController);
    expose(this.extPBMController);
    expose(this.proxyHandler);
    expose(this.conflictObserver);
    expose(this.onboardingController);
    expose(this.butterBarService);
    expose(this.telemetry);
    expose(this.availabilityService);

    this.#handlingEvent = false;
    this.#processPendingEvents();

    await init_done;
    console.info("All subsystems have init.");
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

function openFirstRun(details) {
  if (details.reason !== "install") {
    return;
  }
  const url = browser.runtime.getURL("/ui/firstRun/firstRun.html");
  browser.tabs.create({
    url,
  });
}
browser.runtime.onInstalled.addListener(openFirstRun);
