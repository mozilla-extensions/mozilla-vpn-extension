import {Component} from "./component.js";
import {constants} from "./constants.js";
import {Logger} from "./logger.js";

const log = Logger.logger("Telemetry");

const TELEMETRY_CATEGORY = "vpn.extension";
// TODO: Add 
const TELEMETRY_EVENTS = {

};
// TODO: Add 
const TELEMETRY_SCALARS = {

};

export class Telemetry extends Component {
  constructor(receiver) {
    super(receiver);
    browser.runtime.onInstalled.addListener(async details => this.onInstalled(details));
    log("Registering telemetry events");

    browser.telemetry.registerEvents(TELEMETRY_CATEGORY, TELEMETRY_EVENTS).catch(e => {
      console.error("Failed to register telemetry events!", e);
    });

    browser.telemetry.registerScalars(TELEMETRY_CATEGORY, TELEMETRY_SCALARS).catch(e => {
      console.error("Failed to register telemetry scalars!", e);
    });

    this.version = "";
  }

  async init() {
    const self = await browser.management.getSelf();
    this.version = self.version;
  }

  async onInstalled(details) {
    if (details.reason === "install" || details.reason === "update") {
      let version;

      try {
        let self = await browser.management.getSelf();
        version = self.version;
      } catch (e) {
        version = null;
      }

      this.syncAddEvent("general", details.reason, version);
    }
  }

  syncAddEvent(category, event, value = null, extra = null) {
    log(`Sending telemetry: ${category} - ${event} - ${value} - ${extra}`);

    if (constants.isAndroid) {
      log(`No telemetry on android`);
      return;
    }

    const extraValues = {
      version: this.version,
      ...extra
    };

    browser.telemetry.recordEvent(TELEMETRY_CATEGORY, category, event, value, extraValues).catch(e => {
      console.error("Telemetry.recordEvent failed", e);
    });
  }

  syncAddScalar(scalarName, value) {
    log(`Sending telemetry scalar: ${scalarName} - ${value}`);

    browser.telemetry.scalarAdd(TELEMETRY_CATEGORY + "." + scalarName, value).catch(e => {
      console.error("Telemetry.scalarAdd failed", e);
    });
  }
}
