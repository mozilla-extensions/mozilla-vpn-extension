/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

/**
 * Commands we know we can send
 * to the vpn
 */
export const REQUEST_TYPES = [
  "activate", // activate for Firefox
  "servers",
  "disabled_apps",
  "status",
  "deactivate",
  "focus",
  "openAuth",
  "telemetry",
  "session_start",
  "session_stop",
  "interventions",
  "settings",
  "start",
];

export class VPNState {
  // Name of the current state
  state = "";
  // Whether the Native Message adapter exists
  installed = true;
  // If the Native Message adapter is alive
  alive = false;
  // True if the VPN is enabled.
  connected = false;
  // True if firefox is split-tunneled
  isExcluded = false;
  // True if a subscription is found
  subscribed = false;
  // True if it is authenticated
  authenticated = false;
  // Can be "Stable", "Unstable", "NoSignal"
  connectionHealth = "Stable";

  // True if the client version is post v2.23 but not latest
  needsUpdate = false;
  /**
   * A socks:// url to connect to
   * to bypass the vpn.
   * Is null if it's not supported or active.
   * @type {string | boolean}
   */
  loophole = false;

  /** @type {ServerCity | undefined } */
  exitServerCity = new ServerCity();

  /** @type {ServerCountry | undefined } */
  exitServerCountry = new ServerCountry();

  /** @type {ServerCity | undefined } */
  entryServerCity = new ServerCity();

  /** @type {ServerCountry | undefined } */
  entryServerCountry = new ServerCountry();

  static NoSignal = "NoSignal";
  static Unstable = "Unstable";
  static Stable = "Stable";
}

/**
 * This state is used if the Native Message Port is not
 * available.
 */
export class StateVPNUnavailable extends VPNState {
  state = "Unavailable";
  alive = false;
  installed = false;
}
export class StateVPNClosed extends VPNState {
  state = "Closed";
  alive = false;
  installed = true;
  connected = false;
}

/**
 * Helper base class to imply the vpn process is installed and
 * running
 */
class StateVPNOpened extends VPNState {
  alive = true;
  installed = true;
}

export class StateVPNNeedsUpdate extends StateVPNOpened {
  state = "NeedsUpdate";
  needsUpdate = true;
}

export class StateVPNSignedOut extends StateVPNOpened {
  state = "SignedOut";
  authenticated = false;
}

export class StateVPNSubscriptionNeeded extends StateVPNSignedOut {
  state = "SubscriptionNeeded";
  subscribed = false;
  authenticated = true;
}

/**
 * This state is used if the VPN Client is
 * alive but the Connection is Disabled
 */
export class StateVPNDisabled extends StateVPNSubscriptionNeeded {
  state = "Disabled";
  connected = false;
  subscribed = true;

  /**
   *
   * @param {ServerCity | undefined} entryServerCity
   * @param {ServerCountry | undefined } entryServerCountry
   * @param {ServerCity | undefined} exitServerCity
   * @param {ServerCountry | undefined } exitServerCountry
   */
  constructor(
    entryServerCity,
    entryServerCountry,
    exitServerCity,
    exitServerCountry
  ) {
    super();
    this.entryServerCity = entryServerCity;
    this.entryServerCountry = entryServerCountry;
    this.exitServerCity = exitServerCity;
    this.exitServerCountry = exitServerCountry;
  }
}

/**
 * This state is used if the VPN Client is
 * alive but the Connection is Disabled
 */
export class StateVPNEnabled extends StateVPNDisabled {
  /**
   *
   * @param {string|boolean} aloophole - False if loophole is not supported,
   * @param {ServerCity | undefined} exitServerCity
   * @param {ServerCountry | undefined } exitServerCountry
   */
  constructor(
    entryServerCity,
    entryServerCountry,
    exitServerCity,
    exitServerCountry,
    aloophole,
    connectionHealth = "Stable"
  ) {
    super(
      entryServerCity,
      entryServerCountry,
      exitServerCity,
      exitServerCountry
    );
    this.loophole = aloophole;
    if (
      ![VPNState.NoSignal, VPNState.Stable, VPNState.Unstable].includes(
        connectionHealth
      )
    ) {
      throw new Error(
        `${connectionHealth} is not a Valid Value for ConnectionHealth`
      );
    }
    this.connectionHealth = connectionHealth;
  }
  state = "Enabled";
  subscribed = true;
  connected = true;
}

export class StateVPNOnPartial extends StateVPNEnabled {
  state = "OnPartial";
  alive = true;
  connected = true;
}

// Defining the Nested Serverlist
// so people don't have to dig around <any>
export class Server {
  hostname = "";
  ipv4_gateway = "";
  ipv6_gateway = "";
  multihopPort = 0;
  socksName = "";
  weight = 0;
}

export class ServerCity {
  code = "";
  lat = 0;
  long = 0;
  name = "";
  /** @type {Array <Server>} */
  servers = [];
}
export class ServerCountry {
  /** @type {Array <ServerCity>} */
  cities = [];
  code = "";
  name = "";
}

// This is what the client response when calling status
export class vpnStatusResponse {
  t = "status";
  status = {
    location: {
      exit_country_code: "",
      exit_city_name: "",
      entry_country_code: "",
      entry_city_name: "",
    },
    authenticated: false,
    connectedSince: "0",
    app: "MozillaVPN::CustomState",
    vpn: "Controller::StateOn",
    connectionHealth: "Stable",
    localProxy: {
      available: false,
      url: "https://localhost:8080",
    },
    version: "2.99.0",
  };
}

export class VPNSettings {
  extensionTelemetryEnabled = true;
}

export class BridgeResponse {
  /** @type {string|undefined} */
  status;
  /** @type {string|undefined} */
  error;
  /** @type {string|undefined} */
  exe;
}
