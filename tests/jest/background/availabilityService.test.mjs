/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { AvailabilityService } from "../../../src/background/availabilityService";

import {
  describe,
  expect,
  jest,
  test,
  beforeEach,
  afterEach,
} from "@jest/globals"; // Import test and beforeEach/afterEach
import { property } from "../../../src/shared/property";
import {
  StateVPNClosed,
  StateVPNNeedsUpdate,
  StateVPNOnPartial,
  StateVPNSubscriptionNeeded,
  StateVPNUnavailable,
  VPNState,
} from "../../../src/background/vpncontroller";

class TestRegister {
  registerObserver() {}
}
const mockVpnController = {
  state: property(new VPNState()),
};

describe("availabilityService", () => {
  test("Calls it's check function when the VPN State Changes", () => {
    const target = new AvailabilityService(
      new TestRegister(),
      mockVpnController
    );

    target.check = jest.fn(async () => {
      return {
        available: "string",
        waitlistURL: undefined,
      };
    });
    // Not all states should cause a check
    mockVpnController.state.set(new StateVPNClosed());
    mockVpnController.state.set(new StateVPNNeedsUpdate());
    expect(target.check).toBeCalledTimes(0);
    // Those each should call a a check
    mockVpnController.state.set(new StateVPNSubscriptionNeeded());
    mockVpnController.state.set(new StateVPNUnavailable());
    expect(target.check).toBeCalledTimes(2);
    // Checks no longer should be done
    target.ignore();
    mockVpnController.state.set(new StateVPNSubscriptionNeeded());
    mockVpnController.state.set(new StateVPNUnavailable());
    expect(target.check).toBeCalledTimes(2); // This should not have changed then.
  });
});
