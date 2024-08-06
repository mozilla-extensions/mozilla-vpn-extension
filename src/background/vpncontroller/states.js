/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

const MOZILLA_VPN_SERVERS_KEY = "mozillaVpnServers";

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
   * Constructs state of another state, moving
   * non essential data.
   *
   * @param {VPNState?} other
   */
  constructor(other) {
    if (!other) {
      return;
    }
    if (other.servers) {
      this.servers = [...other.servers];
    }
    if (other.isExcluded != null) {
      this.isExcluded = other.isExcluded;
    }
    this.exitServerCity = other.exitServerCity;
    this.exitServerCountry = other.exitServerCountry;
  }

  /**
   * Takes a state, fetches data from storage and then
   * constructs a copy with the data included.
   *
   * @param {VPNState} state - The state to replicate
   * @param {browser.storage.StorageArea} storage - The storage area to look for
   * @param {String} key - The key to put the state in
   * @returns {Promise<VPNState>} - Returns a copy of the state, or the same in case of missing data.
   */
  static async fromStorage(
    state = new StateVPNUnavailable(null),
    storage = browser.storage.local,
    key = MOZILLA_VPN_SERVERS_KEY
  ) {
    const { mozillaVpnServers } = await storage.get(MOZILLA_VPN_SERVERS_KEY);
    if (typeof mozillaVpnServers === "undefined") {
      await storage.set({ [MOZILLA_VPN_SERVERS_KEY]: [] });
      return state;
    }
    // @ts-ignore
    return new state.constructor({
      servers: mozillaVpnServers,
    });
  }
  /**  Puts a state's data into storage, to make sure we can recreate it next time using
   * @param {VPNState} state - The state to replicate
   * @param {browser.storage.StorageArea} storage - The storage area to look for
   */
  static putIntoStorage(
    state = new StateVPNUnavailable(null),
    storage = browser.storage.local,
    key = MOZILLA_VPN_SERVERS_KEY
  ) {
    // @ts-ignore
    storage.set({ [key]: state.servers });
  }
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
}

/**
 * This state is used if the VPN Client is
 * alive but the Connection is Disabled
 */
export class StateVPNEnabled extends VPNState {
  /**
   *
   * @param {VPNState} other -
   * @param {string|boolean} aloophole - False if loophole is not supported,
   */
  constructor(other, aloophole) {
    super(other);
    if (other) {
      this.loophole = other.loophole;
      this.exitServerCity = other.exitServerCity;
      this.exitServerCountry = other.exitServerCountry;
    }
    if (aloophole) {
      this.loophole = aloophole;
    }
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
