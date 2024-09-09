// /* This Source Code Form is subject to the terms of the Mozilla Public
//  * License, v. 2.0. If a copy of the MPL was not distributed with this
//  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ProxyUtils } from "./proxyUtils.js";

export const ProxyRules = Object.freeze({
  BYPASS_TUNNEL: "BYPASS_TUNNEL",
  DIRECT: "DIRECT",
  USE_EXIT_RELAYS: "USE_EXIT_RELAYS",
});

/**
 * Base class representing a Proxy Rule.
 */
export class ProxyRule {
  /**
   * @param {string} type - The type of proxy rule.
   * @param {Object} defaultProxyInfo - The default proxy info.
   */
  constructor(type, defaultProxyInfo = ProxyUtils.getDirectProxyInfoObject()) {
    this.type = type;
    this.defaultProxyInfo = defaultProxyInfo;
  }
}

/**
 * Direct Proxy Rule (No tunneling).
 */
export class ProxyRuleDirect extends ProxyRule {
  constructor() {
    super(ProxyRules.DIRECT);
  }
}

/**
 * Bypass Tunnel Proxy Rule.
 * 
 * @param {Object} clientState - Client state containing city, country, and servers.
 */
export class ProxyRuleBypassTunnel extends ProxyRule {
  constructor(clientState) {
    const loophole = ProxyUtils.parseProxy(clientState.loophole)
    super(ProxyRules.BYPASS_TUNNEL, loophole);
  }
}

/**
 * Use Exit Relays Proxy Rule.
 * 
 * @param {Object} clientState - Client state containing city, country, and servers.
 */
export class ProxyRuleUseExitRelays extends ProxyRule {
  constructor(clientState) {
    const { exitServerCity, exitServerCountry, servers } = clientState;
    const proxies = ProxyUtils.getProxies(exitServerCountry.code, exitServerCity.code, servers);
    super(ProxyRules.USE_EXIT_RELAYS, proxies);
  }
}
