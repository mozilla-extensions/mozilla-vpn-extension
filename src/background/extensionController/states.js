/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

export class FirefoxVPNState {
  // State name
  state = "";

  // True if the Firefox VPN is On
  enabled = false;

  // True if we need to send all Firefox traffic to the local socks proxy
  bypassTunnel = false;

  // True when the VPN client is in StateOnPartial and we need to proxy all
  // traffic through proxy servers in the client's current server location
  // unless otherwise indicated by a per-site proxy settings.
  useExitRelays = false;
}

/**
 * Used when Firefox VPN is On
 */
export class StateFirefoxVPNEnabled extends FirefoxVPNState {
  constructor(useExitRelays) {
    super();
    this.useExitRelays = useExitRelays;
  }
  state = "Enabled";
  enabled = true;
  bypassTunnel = false;
}

/**
 * Used when Firefox VPN is Off
 */
export class StateFirefoxVPNDisabled extends FirefoxVPNState {
  constructor(bypassTunnel) {
    super();
    this.bypassTunnel = bypassTunnel;
  }
  state = "Disabled";
  enabled = false;
  useExitRelays = false;
}

/**
 * Used when the client is unavailable
 */
export class StateFirefoxVPNIdle extends FirefoxVPNState {
  state = "Idle";
  enabled = false;
  bypassTunnel = false;
  useExitRelays = false;
}

/**
 * Used when the FirefoxVPN is enabled from the popup
 * and we're waiting for the client response and state change
 * to StateOnPartial.
 */
export class StateFirefoxVPNConnecting extends FirefoxVPNState {
  state = "Connecting";
  enabled = false;
  bypassTunnel = false;
  useExitRelays = false;
}
