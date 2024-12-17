/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test, jest } from "@jest/globals";

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
  test("Reacts to state changes", () => {
    const controller = new TestController();
    const target = new ExtensionController(new TestRegister(), controller);
    controller.state.set(new StateVPNEnabled());
    expect(target.state.value.enabled).toBe(true);
    controller.state.set(new StateVPNUnavailable());
    expect(target.state.value.enabled).toBe(false);
  });
  test("Sends an 'activation' command when user request activation", () => {
    // Simulate the device is disconnected
    const controller = new TestController();
    controller.state.set(new StateVPNDisabled());
    const target = new ExtensionController(new TestRegister(), controller);
    // To enable we need to send an 'activation' command
    target.toggleConnectivity();
    expect(controller.lastPostToApp.value).toBe("activate");
  });
  test("It does *not* reset the timer when switching from partial to full protection", async () => {
    // Simulate the device is disconnected
    const controller = new TestController();
    controller.state.set(new StateVPNDisabled());
    const target = new ExtensionController(new TestRegister(), controller);
    // To enable we need to send an 'activation' command
    target.toggleConnectivity();
    expect(controller.lastPostToApp.value).toBe("activate");
    controller.state.set(new StateVPNOnPartial());

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

  test("when switching from partial to full protection useExitRelays is updated", () => {
    // Simulate the device is disconnected
    const controller = new TestController();
    controller.state.set(new StateVPNDisabled());
    const target = new ExtensionController(new TestRegister(), controller);
    // To enable we need to send an 'activation' command
    target.toggleConnectivity();
    expect(controller.lastPostToApp.value).toBe("activate");
    controller.state.set(new StateVPNOnPartial());

    // In Partal mode all protected traffic needs to use the exit relays
    expect(target.state.value.useExitRelays).toBe(true);
    controller.state.set(new StateVPNEnabled());

    // In full protection mode, we can skip that.
    expect(target.state.value.useExitRelays).toBe(false);
  });

  describe("Upon Firefox launch, the VPN Extension status follows the status of the VPN client", () => {
    test("If Firefox is launched while the VPN client is ON, the extension starts with a default ON state", () => {
      const testController = new TestController(new StateVPNClosed());
      const target = new ExtensionController(
        new TestRegister(),
        testController
      );
      expect(target.state.value.enabled).toBe(false);
      testController.state.set(new StateVPNEnabled());
      expect(target.state.value.enabled).toBe(true);
    });
    test("If Firefox is launched while the VPN client is OFF, the extension starts with a default OFF state", () => {
      const testController = new TestController(new StateVPNClosed());

      const target = new ExtensionController(
        new TestRegister(),
        testController
      );
      expect(target.state.value.enabled).toBe(false);
      testController.state.set(new StateVPNDisabled());
      expect(target.state.value.enabled).toBe(false);
    });

    test("If Firefox was launched when the VPN client was OFF, turning the VPN client ON, should turn the VPN extension ON.", () => {
      const testController = new TestController(new StateVPNClosed());

      const target = new ExtensionController(
        new TestRegister(),
        testController
      );
      expect(target.state.value.enabled).toBe(false);
      testController.state.set(new StateVPNDisabled());
      expect(target.state.value.enabled).toBe(false);

      // If we now have turned it on, it should follow
      testController.state.set(new StateVPNEnabled());
      expect(target.state.value.enabled).toBe(true);
    });
    test("If the client is unexpectedly deactivated from StateOnPartial, the extension should attempt to reactivate.", () => {
      const testController = new TestController(new StateVPNClosed());

      const target = new ExtensionController(
        new TestRegister(),
        testController
      );
      expect(target.state.value.enabled).toBe(false);
      testController.state.set(new StateVPNOnPartial());
      expect(target.state.value.enabled).toBe(true);
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
