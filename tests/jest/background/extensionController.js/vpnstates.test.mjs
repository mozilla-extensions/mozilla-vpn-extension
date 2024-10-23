/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test, jest } from "@jest/globals";

import { property } from "../../../../src/shared/property.js";

class TestRegister {
  registerObserver() {}
}
class TestController {
  state = property(new VPNState());

  postToApp(command) {
    this.lastPostToApp.set(command);
  }
  lastPostToApp = property("");
}

import {
  FirefoxVPNState,
  StateFirefoxVPNEnabled,
  StateFirefoxVPNConnecting,
  isEquatable,
} from "../../../../src/background/extensionController/states.js";

describe("ExtensionControllerStates::equality", () => {
  test("same state is equal", () => {
    const state = new FirefoxVPNState();
    expect(isEquatable(state, state)).toBe(true);
  });
  test("2 diffrent states are not equal", () => {
    expect(
      isEquatable(new FirefoxVPNState(), new StateFirefoxVPNConnecting())
    ).toBe(false);
  });
  test("State enabled is only equal if it has the same 'useproxy' value", () => {
    expect(
      isEquatable(
        new StateFirefoxVPNEnabled(true),
        new StateFirefoxVPNEnabled(true)
      )
    ).toBe(true);
    expect(
      isEquatable(
        new StateFirefoxVPNEnabled(true),
        new StateFirefoxVPNEnabled(false)
      )
    ).toBe(false);
  });
  test("State enabled equality ignores timestamps", () => {
    expect(
      isEquatable(
        new StateFirefoxVPNEnabled(true, 666),
        new StateFirefoxVPNEnabled(true, 999)
      )
    ).toBe(true);
    expect(
      isEquatable(
        new StateFirefoxVPNEnabled(true, 666),
        new StateFirefoxVPNEnabled(false, 999)
      )
    ).toBe(false);
  });
});
