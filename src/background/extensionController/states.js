/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

export class FirefoxVPNState {
  /**
   *
   * The current state of the extension.
   * @type {string}
   */
  state = "";

  /**
   * True when Firefox VPN is enabled.
   * @type {boolean}
   */
  enabled = false;

  /**
   * True when the Firefox VPN has been deactivated
   * but the client VPN is connected.
   * Determines whether all traffic should be proxied
   * through the local socks proxy.
   *
   * @type {boolean}
   */
  bypassTunnel = false;

  /**
   * True when the VPN is in StateOnPartial
   * Determines whether all Firefox traffic should be routed
   * through an exit relay
   *
   * @type {boolean}
   */
  useExitRelays = false;
}

/**
 * When Firefox VPN is On
 */
export class StateFirefoxVPNEnabled extends FirefoxVPNState {
  /**
   * @param {boolean} useExitRelays
   */
  constructor(useExitRelays) {
    super();
    this.useExitRelays = useExitRelays;
  }
  state = "Enabled";
  enabled = true;
  bypassTunnel = false;
}

/**
 * When Firefox VPN is Off
 */
export class StateFirefoxVPNDisabled extends FirefoxVPNState {
  /**s
   * @param {boolean} bypassTunnel
   */
  constructor(bypassTunnel) {
    super();
    this.bypassTunnel = bypassTunnel;
  }
  state = "Disabled";
  enabled = false;
  useExitRelays = false;
}

/**
 * When the client is unavailable
 */
export class StateFirefoxVPNIdle extends FirefoxVPNState {
  state = "Idle";
  enabled = false;
  bypassTunnel = false;
  useExitRelays = false;
}

/**
 * When the FirefoxVPN is enabled from the popup
 * and we're waiting for the client response and state change
 * to StateOnPartial.
 */
export class StateFirefoxVPNConnecting extends FirefoxVPNState {
  state = "Connecting";
  enabled = false;
  bypassTunnel = false;
  useExitRelays = false;
}
