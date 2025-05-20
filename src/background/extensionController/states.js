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

  connecting = false;

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

  /**
   * Timestamp since the VPN connection was established
   */
  connectedSince = 0;
}

/**
 * When Firefox VPN is On
 */
export class StateFirefoxVPNEnabled extends FirefoxVPNState {
  /**
   * @param {boolean} useExitRelays
   * @param {number} connectedSince
   */
  constructor(useExitRelays, connectedSince) {
    super();
    this.useExitRelays = useExitRelays;
    this.connectedSince = connectedSince;
  }
  state = "Enabled";
  enabled = true;
  bypassTunnel = false;
}

/**
 * When Firefox VPN is Off
 *
 * bypassTunnel = true means the VPN client is still connected, but the extension is off.
 * In this case, all traffic should be routed through the Firefox proxy (bypassTunnel = true),
 * otherwise (bypassTunnel = false) the browser proxy is used if set, or direct if not.
 */
export class StateFirefoxVPNDisabled extends FirefoxVPNState {
  /**
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
  connecting = true;
  bypassTunnel = false;
  useExitRelays = false;
}

/**
 * Checks if 2 states are equal, ignoring the timestamps.
 * @param {FirefoxVPNState} state
 * @param {FirefoxVPNState} other
 * @returns true if they are 2 equal states.
 */
export function isEquatable(
  state = new FirefoxVPNState(),
  other = new FirefoxVPNState()
) {
  if (state === other) {
    return true;
  }
  if (state.constructor !== other.constructor) {
    return false;
  }
  return (
    state.useExitRelays === other.useExitRelays &&
    state.bypassTunnel === other.bypassTunnel
  );
}
