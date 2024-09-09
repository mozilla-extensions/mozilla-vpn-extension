/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

import { ProxyRule,ProxyRuleDirect } from "../proxyHandler/proxyRules.js";

export class FirefoxVPNState {
  // State name
  state = "";

  // True if the Firefox VPN is On
  enabled = false;

  /** @type {ProxyRule} */ 
  proxyRule = new ProxyRuleDirect();
}

/**
 * The state is used when Firefox VPN is On
 */
export class StateFirefoxVPNEnabled extends FirefoxVPNState {
  /**
   * @param {ProxyRule} rule - How requests should be proxied by default
   */
  constructor(rule) {
    super();
    this.proxyRule = rule;
  }
  state = "Enabled";
  enabled = true;
}


/**
 * This state is used when Firefox VPN is Off
 */
export class StateFirefoxVPNDisabled extends FirefoxVPNState {
 /**
   * @param {ProxyRule} rule - How requests should be proxied by default
 */
  constructor(rule) {
    super();
    this.proxyRule = rule;
  }
  state = "Disabled";
  enabled = false;
}


export class StateFirefoxVPNIdle extends FirefoxVPNState {
  state = "Idle";
  enabled = false;
  proxyRule = new ProxyRuleDirect();
}