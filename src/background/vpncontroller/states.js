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
];

export class VPNState {
  // Name of the current state
  state = "";
  // If the Native Message adapter is alive
  alive = false;
  // True if the VPN is enabled.
  connected = false;
  // True if firefox is split-tunneled
  isExcluded = false;
  /**
   * A socks:// url to connect to
   * to bypass the vpn.
   * Is null if it's not supported or active.
   * @type {string | boolean}
   */
  loophole = false;
  /** @type {Array <ServerCountry> } */
  servers = [];

  /** @type {ServerCity | undefined } */
  exitServerCity = new ServerCity();

  /** @type {ServerCountry | undefined } */
  exitServerCountry = new ServerCountry();
  /**
   * Timestamp since the VPN connection was established
   */
  connectedSince = 0;
}

/**
 * This state is used if the Native Message Port is not
 * available.
 */
export class StateVPNUnavailable extends VPNState {
  state = "Unavailable";
  alive = false;
  connected = false;
}

/**
 * This state is used if the VPN Client is
 * alive but the Connection is Disabled
 */
export class StateVPNDisabled extends VPNState {
  state = "Disabled";
  alive = true;
  connected = false;

  /**
   *
   * @param {ServerCity | undefined} exitServerCity
   * @param {ServerCountry | undefined } exitServerCountry
   */
  constructor(exitServerCity, exitServerCountry) {
    super();
    this.exitServerCity = exitServerCity;
    this.exitServerCountry = exitServerCountry;
  }
}

/**
 * This state is used if the VPN Client is
 * alive but the Connection is Disabled
 */
export class StateVPNEnabled extends VPNState {
  /**
   *
   * @param {string|boolean} aloophole - False if loophole is not supported,
   * @param {ServerCity | undefined} exitServerCity
   * @param {ServerCountry | undefined } exitServerCountry
   */
  constructor(exitServerCity, exitServerCountry, aloophole, connectedSince) {
    super();
    this.exitServerCity = exitServerCity;
    this.exitServerCountry = exitServerCountry;
    this.loophole = aloophole;
    this.connectedSince = connectedSince;
  }
  state = "Enabled";
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
    localProxy: {
      available: false,
      url: "https://localhost:8080",
    },
  };
}
