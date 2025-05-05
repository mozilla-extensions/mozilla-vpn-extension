/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test, jest } from "@jest/globals";
import { createMockedBrowserStore } from "../testutils.mjs";

import { property } from "../../../../src/shared/property.js";

class TestRegister {
  registerObserver() {}
}
class TestController {
  constructor(s = new VPNState()) {
    this.state = property(s);
  }
  state;

  postToApp(command) {
    this.lastPostToApp.set(command);

    if (command == "activate") {
      if (!this.state.value.connected) {
        this.state.set(new StateVPNOnPartial());
      }
    }
  }
  lastPostToApp = property("");
}

const mockStorage = createMockedBrowserStore();

global.browser = {
  storage: {
    local: mockStorage,
  },
};

/**
 * Inits a small test case.
 * -> Starts with the VPN closed, then switchting to $vpnstate
 */
async function initWith(vpnstate = new StateVPNDisabled()) {
  mockStorage.clearStore();
  const controller = new TestController();
  controller.state.set(new StateVPNClosed());
  const target = new ExtensionController(new TestRegister(), controller);
  const init = target.init();
  controller.state.set(vpnstate);
  await init;
  return {
    controller,
    target,
  };
}

import { ExtensionController } from "../../../../src/background/extensionController/extensionController.js";
import {
  StateVPNClosed,
  StateVPNDisabled,
  StateVPNEnabled,
  StateVPNOnPartial,
  StateVPNUnavailable,
  VPNState,
} from "../../../../src/background/vpncontroller/states.js";
describe("ExtensionController", () => {
  test("Can be created", () => {
    const target = new ExtensionController(
      new TestRegister(),
      new TestController()
    );
  });
  // TODO: This is only temporary okay, we want it to be independent at some point
  // just making sure this behavior is documented until we start working on it. :)
  test("Reacts to state changes", async () => {
    const { controller, target } = await initWith(new StateVPNDisabled());
    controller.state.set(new StateVPNEnabled());
    expect(target.state.value.enabled).toBe(true);
    controller.state.set(new StateVPNUnavailable());
    expect(target.state.value.enabled).toBe(false);
  });
  test("Sends an 'activation' command when user request activation", async () => {
    // Simulate the device is disconnected
    const { controller, target } = await initWith(new StateVPNDisabled());
    // To enable we need to send an 'activation' command
    target.toggleConnectivity();
    expect(controller.lastPostToApp.value).toBe("activate");
  });
  test("It does *not* reset the timer when switching from partial to full protection", async () => {
    // Simulate the device is disconnected
    const { controller, target } = await initWith(new StateVPNDisabled());

    // To enable we need to send an 'activation' command
    const hasConnected = target.toggleConnectivity();
    expect(controller.lastPostToApp.value).toBe("activate");
    controller.state.set(new StateVPNOnPartial());
    await hasConnected; // Should now resolve.
    // Now we should have a timestamp
    const timestamp = target.state.value.connectedSince;
    expect(timestamp).not.toBe(0);
    // Wait 10ms to avoid timeing issues
    await new Promise((resolve) => setTimeout(resolve, 10));
    // let's simulate the user activating the vpn on the device.
    controller.state.set(new StateVPNEnabled());
    expect(timestamp).toBe(target.state.value.connectedSince);
    // The Timestamps should be the same.
  });

  test("when switching from partial to full protection useExitRelays is updated", async () => {
    // Simulate the device is disconnected
    const controller = new TestController();
    const hasConnected = controller.state.set(new StateVPNDisabled());
    const target = new ExtensionController(new TestRegister(), controller);
    await target.init();
    // To enable we need to send an 'activation' command
    target.toggleConnectivity();
    expect(controller.lastPostToApp.value).toBe("activate");
    controller.state.set(new StateVPNOnPartial());
    await new Promise((resolve) => setTimeout(resolve, 0));
    // In Partal mode all protected traffic needs to use the exit relays
    expect(target.state.value.useExitRelays).toBe(true);

    controller.state.set(new StateVPNEnabled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    // In full protection mode, we can skip that.
    expect(target.state.value.useExitRelays).toBe(false);
  });

  describe("Upon Firefox launch, the VPN Extension status follows the status of the VPN client", () => {
    test("If Firefox is launched while the VPN client is ON, the extension starts with a default ON state", async () => {
      const testController = new TestController(new StateVPNClosed());
      const target = new ExtensionController(
        new TestRegister(),
        testController
      );
      const init = target.init();
      expect(target.state.value.enabled).toBe(false);
      testController.state.set(new StateVPNEnabled());
      await init;
      expect(target.state.value.enabled).toBe(true);
    });
    test("If Firefox is launched while the VPN client is OFF, the extension starts with a default OFF state", () => {
      const testController = new TestController(new StateVPNClosed());

      const target = new ExtensionController(
        new TestRegister(),
        testController
      );
      target.init();
      expect(target.state.value.enabled).toBe(false);
      testController.state.set(new StateVPNDisabled());
      expect(target.state.value.enabled).toBe(false);
    });

    test("If Firefox was launched when the VPN client was OFF, turning the VPN client ON, should turn the VPN extension ON.", async () => {
      const testController = new TestController(new StateVPNClosed());

      const target = new ExtensionController(
        new TestRegister(),
        testController
      );
      const init = target.init();
      testController.state.set(new StateVPNDisabled());
      await init;
      expect(target.state.value.enabled).toBe(false);

      // If we now have turned it on, it should follow
      testController.state.set(new StateVPNEnabled());
      expect(target.state.value.enabled).toBe(true);
    });
    test("If the client is unexpectedly deactivated from StateOnPartial, the extension should attempt to reactivate.", async () => {
      const testController = new TestController(new StateVPNClosed());

      const target = new ExtensionController(
        new TestRegister(),
        testController
      );
      const init = target.init();
      expect(target.state.value.enabled).toBe(false);
      testController.state.set(new StateVPNDisabled());
      await init;
      expect(target.state.value.enabled).toBe(false);

      const hasConnected = target.toggleConnectivity();
      testController.state.set(new StateVPNOnPartial());
      await hasConnected;
      // Given that the client did an unexpected disconnect,
      // the extension should ask to re-enable instantly
      // without disconnecting
      testController.state.set(new StateVPNDisabled());
      // We should have sent a reconnect
      expect(testController.lastPostToApp.value).toBe("activate");
      // We still should have been enabled.
      expect(target.state.value.enabled).toBe(true);
    });
  });
});
