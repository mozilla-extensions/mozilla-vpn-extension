/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { beforeEach, describe, expect, test, jest } from "@jest/globals";
import {
  fromVPNStatusResponse,
  isSplitTunnled,
  ServerCity,
  ServerCountry,
  VPNController,
  VPNSettings,
  vpnStatusResponse,
} from "../../../../src/background/vpncontroller";
import { property } from "../../../../src/shared/property";

describe("isSplitTunneled", () => {
  const cases = [
    { res: true, path: "/soo/bar/Firefox Nightly/firefox.exe" },
    { res: true, path: "/soo/bar/Firefox Developer Edition/firefox.exe" },
    { res: true, path: "/soo/bar/Firefox/firefox.exe" },
    { res: true, path: "/soo/bar/Firefox Nightly/firefox" },
    { res: true, path: "/soo/bar/Firefox Developer Edition/firefox" },
    { res: true, path: "/soo/bar/Firefox/firefox" },
    { res: false, path: "/soo/bar/Waterfox/Waterfox" },
  ];
  cases.forEach((c) => {
    it(`Should handle ${c.path}`, () => {
      expect(
        isSplitTunnled({
          t: "disabled_apps",
          disabled_apps: [c.path],
        })
      ).toBe(c.res);
    });
  });
  it(`No apps split tunneled`, () => {
    expect(
      isSplitTunnled({
        t: "disabled_apps",
        disabled_apps: [],
      })
    ).toBe(false);
  });
  it(`Has default args`, () => {
    expect(isSplitTunnled()).toBe(false);
  });
  it(`Throws with wrong args`, () => {
    try {
      isSplitTunnled({
        t: "malformed_apps",
        disabled_apps: [],
      });
      // Unreachable Hopefully
      expect(null).toBe(true);
    } catch (error) {
      expect(error.toString()).toContain("passed an invalid response");
    }
  });
});

describe("fromVPNStatusResponse", () => {
  const makeCountry = (code, name) => {
    const out = new ServerCountry();
    out.code = code;
    out.name = name;
    return out;
  };
  const makeCity = (code, name) => {
    const x = new ServerCity();
    x.code = code;
    x.name = name;
    return x;
  };

  const list = (() => {
    const l = [];
    const germany = makeCountry("de", "germany");
    germany.cities.push(makeCity("ber", "berlin"));
    l.push(germany);
    const mordor = makeCountry("mor", "mordor");
    mordor.cities.push("oh", "Actually no idea what the name would be");
    l.push(mordor);
    return l;
  })();

  it("fails on a non status response", () => {
    const msg = new vpnStatusResponse();
    msg.t = "no status";
    expect(fromVPNStatusResponse(msg)).toBeUndefined();
  });

  it("It can Create a StateOff Status", () => {
    const msg = new vpnStatusResponse();
    msg.status.vpn = "StateOff";
    msg.status.location.entry_city_name = "berlin";
    msg.status.location.entry_country_code = "de";
    msg.status.location.exit_country_code = "mor";
    msg.status.location.exit_city_name =
      "Actually no idea what the name would be";
    msg.status.version = "2.25.1";

    const result = fromVPNStatusResponse(msg, list);
    expect(result.exitServerCity).toBe(list[1][0]);

    expect(result.exitServerCountry).toBe(list[1]);
    expect(result.connected).toBe(false);
    expect(result.state).toBe("Disabled");
  });

  it("It creates a StateOff Status when Disconnecting", () => {
    const msg = new vpnStatusResponse();
    msg.status.vpn = "StateDisconnecting";
    msg.status.location.entry_city_name = "berlin";
    msg.status.location.entry_country_code = "de";
    msg.status.location.exit_country_code = "mor";
    msg.status.location.exit_city_name =
      "Actually no idea what the name would be";
    msg.status.version = "2.25.1";

    const result = fromVPNStatusResponse(msg, list);
    expect(result.exitServerCity).toBe(list[1][0]);
    expect(result.exitServerCountry).toBe(list[1]);
    expect(result.connected).toBe(false);
    expect(result.state).toBe("Disabled");
  });

  it("It creates a StateOn Status ", () => {
    const msg = new vpnStatusResponse();
    msg.status.vpn = "StateOn";
    msg.status.connectedSince = "1";
    msg.status.location.entry_city_name = "berlin";
    msg.status.location.entry_country_code = "de";
    msg.status.location.exit_country_code = "mor";
    msg.status.location.exit_city_name =
      "Actually no idea what the name would be";
    msg.status.version = "2.25.1";

    const result = fromVPNStatusResponse(msg, list);
    expect(result.exitServerCity).toBe(list[1][0]);
    expect(result.exitServerCountry).toBe(list[1]);
    expect(result.connected).toBe(true);
    expect(result.state).toBe("Enabled");
  });

  it("It can Handle Subscription needed", () => {
    const obj = {
      status: {
        app: "StateSubscriptionNeeded",
        authenticated: true,
        location: {
          entry_city_name: "",
          entry_country_code: "",
          exit_city_name: "",
          exit_country_code: "",
        },
        vpn: "StateInitializing",
        version: "2.25.2",
      },
      t: "status",
    };
    const result = fromVPNStatusResponse(obj);
    expect(result).not.toBeNull();
    expect(result.state).toBe("SubscriptionNeeded");
    expect(result.subscribed).toBe(false);
  });

  it("It can handle StateVPNNeedsUpdate", () => {
    const msg = new vpnStatusResponse();
    msg.status.vpn = "StateOn";
    msg.status.connectedSince = "1";
    msg.status.location.entry_city_name = "berlin";
    msg.status.location.entry_country_code = "de";
    msg.status.location.exit_country_code = "mor";
    msg.status.location.exit_city_name =
      "Actually no idea what the name would be";
    msg.status.version = "2.23.0";

    const result = fromVPNStatusResponse(msg);
    expect(result).not.toBeNull();
    expect(result.state).toBe("NeedsUpdate");
  });
});

describe("handleBridgeResponse", () => {
  /** @type { VPNController}  */
  let vpnController;

  beforeEach(() => {
    vpnController = new VPNController({ registerObserver: () => {} });
    vpnController.postToApp = jest.fn();
  });

  test("handles vpn-client-down when client is alive", async () => {
    const state = property({ alive: true, installed: true });
    await vpnController.handleBridgeResponse(
      { status: "vpn-client-down" },
      state
    );

    expect(state.value.installed).toBe(true);
    expect(state.value.alive).toBe(false);
  });

  test("handles vpn-client-down when client is uninstalled", async () => {
    const state = property({ alive: false, installed: false });

    await vpnController.handleBridgeResponse(
      { status: "vpn-client-down" },
      state
    );

    expect(state.value.installed).toBe(true);
    expect(state.value.alive).toBe(false);
  });

  test("handles vpn-client-up", async () => {
    const state = {};

    await vpnController.handleBridgeResponse(
      { status: "vpn-client-up" },
      state
    );

    // Handle bridgeResponse queues Microtasks for each thing it neets,
    // So queue one up and await it so all others have been called now.
    await new Promise((r) => queueMicrotask(r));

    expect(vpnController.postToApp).toHaveBeenCalledWith("featurelist");
    expect(vpnController.postToApp).toHaveBeenCalledWith("status");
    expect(vpnController.postToApp).toHaveBeenCalledWith("servers");
    expect(vpnController.postToApp).toHaveBeenCalledWith("disabled_apps");
    expect(vpnController.postToApp).toHaveBeenCalledWith("settings");
  });

  test("ignores unknown status", async () => {
    const state = property({ alive: false, installed: false });

    await vpnController.handleBridgeResponse(
      { status: "unknown-status" },
      state
    );

    expect(state.value.state).not.toBe("Closed");
    expect(vpnController.postToApp).not.toHaveBeenCalled();
  });
});

describe("IPC::Settings", () => {
  it("can handle a setting response", async () => {
    const target = new VPNController({ registerObserver: () => {} });
    // The Value should be the default one.
    expect(target.settings.value.extensionTelemetryEnabled).toBe(
      new VPNSettings().extensionTelemetryEnabled
    );
    // The VPN Client may at any point push new data
    const message = {
      t: "settings",
      settings: {
        // Send the inverse
        extensionTelemetryEnabled: !new VPNSettings().extensionTelemetryEnabled,
      },
    };
    await target.handleResponse(message);
    expect(target.settings.value.extensionTelemetryEnabled).toBe(
      message.settings.extensionTelemetryEnabled
    );
  });
  it("ignores unknown settings", async () => {
    const target = new VPNController({ registerObserver: () => {} });
    const message = {
      t: "settings",
      settings: {
        thisSettingDoesNotExist: true,
      },
    };
    await target.handleResponse(message);
    expect(target.settings.value["thisSettingDoesNotExist"]).toBe(undefined);
  });
});
