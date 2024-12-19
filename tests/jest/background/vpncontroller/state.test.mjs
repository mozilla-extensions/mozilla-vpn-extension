/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test } from "@jest/globals";
import {
  StateVPNDisabled,
  StateVPNEnabled,
  VPNState,
  StateVPNUnavailable,
  Server,
  ServerCity,
} from "../../../../src/background/vpncontroller/states";

describe("VPN State Machine", () => {
  const STATE_CONSTRUCTORS = [
    StateVPNDisabled,
    StateVPNEnabled,
    VPNState,
    StateVPNUnavailable,
  ];

  test("Can Create all States", () => {
    const result = STATE_CONSTRUCTORS.map((state) => new state());
    expect(result.length).toBe(STATE_CONSTRUCTORS.length);
  });
});
