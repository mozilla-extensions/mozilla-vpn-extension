/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { beforeEach, describe, expect, test, jest } from "@jest/globals";
import { property } from "../../../src/shared/property";
import { VPNSettings } from "../../../src/background/vpncontroller";
import { Telemetry } from "../../../src/background/telemetry";
import { SiteContext } from "../../../src/background/proxyHandler";
import {
  FirefoxVPNState,
  StateFirefoxVPNConnecting,
  StateFirefoxVPNDisabled,
  StateFirefoxVPNEnabled,
  StateFirefoxVPNIdle,
} from "../../../src/background/extensionController";

// Mock the browser API
const mocksendMessage = jest.fn();

const controller = {
  settings: property(new VPNSettings()),
  postToApp: (a) => {
    if (a == "telemetry") {
      // If it's not telemetry, we don't care
      mocksendMessage(a);
    }
  },
};

const mockParent = {
  registerObserver: () => {},
};

const extensionController = {
  state: property(new FirefoxVPNState()),
};
const proxyHandler = {
  siteContexts: property(new Map()),
};

describe("Telemetry", () => {
  beforeEach(() => {
    globalThis.browser = {
      runtime: {
        onInstalled: {
          addListener: jest.fn(),
        },
      },
      storage: {
        local: {
          get: () => {
            return { dataCollectionConsent: true };
          },
          set: jest.fn(),
        },
      },
    };
    mocksendMessage.mockReset();
    controller.settings = property(new VPNSettings());
    extensionController.state = property(new FirefoxVPNState());
    proxyHandler.siteContexts = property(new Map());
  });

  describe("telemetryEnabled", () => {
    it("It will send changes to the VPNController", async () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      await target.init();
      expect(target.telemetryEnabled.value).toBe(
        controller.settings.value.extensionTelemetryEnabled
      );
      // Now let's "fake" that the underlying settings changed.
      const newvalue = !target.telemetryEnabled.value;
      target.setTelemetryEnabled(newvalue);
      expect(mocksendMessage).toBeCalledWith("settings", {
        settings: {
          extensionTelemetryEnabled: newvalue,
        },
      });
    });
  });

  describe("record", () => {
    beforeEach(() => {
      mocksendMessage.mockReset();
      // Make sure to default telemetry = on
      const setting = new VPNSettings();
      setting.extensionTelemetryEnabled = true;
      controller.settings = property(setting);
    });

    it.only("Does not send data when telemetry is disabled", async () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      await target.init();
      target.setTelemetryEnabled(false);
      target.record("THIS SHOULD NOT BE SENT");
      expect(mocksendMessage).toBeCalledTimes(0);
    });
    it("Does not send data when there is no event", async () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      await target.init();
      target.record();
      expect(mocksendMessage).toBeCalledTimes(0);
    });
    it("Does send event data to the controller", async () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      await target.init();
      target.record("hello_event", 43);
      expect(mocksendMessage).toBeCalledWith("telemetry", {
        name: "hello_event",
        args: 43,
      });
    });
  });

  describe("evaluateSiteContexts", () => {
    it("returns the correct amount of values", () => {
      const data = new Map();
      data.set(
        "a",
        new SiteContext({
          excluded: true,
        })
      );
      data.set(
        "b",
        new SiteContext({
          excluded: true,
        })
      );
      data.set(
        "c",
        new SiteContext({
          excluded: false,
        })
      );
      const res = Telemetry.evaluateSiteContexts(data);
      expect(res.excluded).toBe(2);
      expect(res.geoPrefed).toBe(1);
    });
  });

  describe("sessions", () => {
    it("Will start a session when the ExtensionController is 'enabled'", () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      extensionController.state.set(new StateFirefoxVPNEnabled(true, 0));
      expect(mocksendMessage).toBeCalledWith("session_start");
    });
    it("Will *NOT* start a session when switching from partial to full", () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      extensionController.state.set(new StateFirefoxVPNEnabled(true, 0));
      expect(mocksendMessage).toBeCalledWith("session_start");
      mocksendMessage.mockReset();
      extensionController.state.set(new StateFirefoxVPNEnabled(false, 0));
      expect(mocksendMessage).not.toBeCalled();
    });
    it("Will stop a session when switching from started -> stopped", () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      extensionController.state.set(new StateFirefoxVPNEnabled(true, 0));
      expect(mocksendMessage).toBeCalledWith("session_start");
      mocksendMessage.mockReset();
      extensionController.state.set(new StateFirefoxVPNDisabled(false));
      expect(mocksendMessage).toBeCalledWith("session_stop");
    });
    it("Will ignore idle/connecting", () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      // in those states, nothing may be sent!
      [new StateFirefoxVPNConnecting(), new StateFirefoxVPNIdle()].forEach(
        (s) => {
          extensionController.state.set(s);
          expect(mocksendMessage).not.toBeCalled();
        }
      );
    });
  });

  describe("proxyHandler", () => {
    beforeEach(() => {
      // Make sure to default telemetry = on
      const setting = new VPNSettings();
      setting.extensionTelemetryEnabled = true;
      controller.settings = property(setting);
    });
    it("Will record changes to the sitecontext list", async () => {
      const target = new Telemetry(
        mockParent,
        controller,
        extensionController,
        proxyHandler
      );
      await target.init();
      const m = new Map();
      m.set("a", new SiteContext({ excluded: true }));
      m.set("b", new SiteContext({ excluded: false }));
      m.set("c", new SiteContext({ excluded: true }));
      proxyHandler.siteContexts.set(m);
      expect(mocksendMessage).toBeCalledTimes(2);
    });
  });
});
