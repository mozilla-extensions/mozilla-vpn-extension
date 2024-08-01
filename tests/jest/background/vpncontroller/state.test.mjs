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

  test("Can Create a State from another keeping data", () => {
    const stateA = new VPNState();
    // Servers is persistent, so if we call new State(oldState)
    stateA.servers.push({ cities: [], code: "de", name: "GERMONY" });
    stateA.isExcluded = true;

    const endstate = STATE_CONSTRUCTORS.reduce(
      (state, nextstate) => new nextstate(state),
      stateA
    );
    expect(endstate.servers[0].name).toBe(stateA.servers[0].name);
    expect(endstate.servers[0].code).toBe(stateA.servers[0].code);
    expect(endstate.isExcluded).toBe(stateA.isExcluded);
  });

  test("The Proxy Field is Set in 'Enabled' and Removed on Other states", () => {
    const testState = new StateVPNEnabled();
    // Servers is persistent, so if we call new State(oldState)
    testState.loophole = "aaa";

    expect(new StateVPNEnabled(testState).loophole).toBe(testState.loophole);
    expect(new StateVPNDisabled(testState).loophole).toBe(false);
    expect(new StateVPNUnavailable(testState).loophole).toBe(false);
    expect(new VPNState(testState).loophole).toBe(false);
  });
  test("The ExitServer Field is Set in 'Enabled' and Removed on Other states", () => {
    const testCity = new ServerCity();
    testCity.code = "de";
    testCity.name = "Berlino";
    testCity.servers = [];
    const testState = new StateVPNEnabled(null, "aaa", testCity);

    expect(testState.exitServerCity.code).toBe(testCity.code);

    expect(new StateVPNEnabled(testState).exitServerCity.code).toBe(
      testState.exitServerCity.code
    );
    expect(new StateVPNDisabled(testState).exitServerCity.code).toBe("");
    expect(new StateVPNUnavailable(testState).exitServerCity.code).toBe("");
    expect(new VPNState(testState).exitServerCity.code).toBe("");
  });
});
