/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test } from "@jest/globals";
import { ProxyUtils } from "../../../../src/background/proxyHandler/proxyUtils";

describe("ProxyUtils", () => {
  describe("getSiteContextsStorageKey", () => {
    const result = ProxyUtils.SiteContextsStorageKey;
    expect(result).toBe("siteContexts");
    /* 
      If you've failed this test it is because you've changed the value of
      the siteContexts storage key. If this extension has already 
      shipped to the masses, Have A Think™ about how changing this storage key
      will affect existing users.
    */
  });

  describe("getProxies", () => {
    test("should return an array of proxyInfo objects ordered by weight", () => {
      const servers = [
        {
          code: "US",
          cities: [
            {
              name: "Dallas",
              code: "DAL",
              servers: [
                { socksName: "us-dal-1", weight: 10 },
                { socksName: "us-dal-2", weight: 20 },
                { socksName: null, weight: 5 },
              ],
            },
          ],
        },
      ];

      const result = ProxyUtils.getProxies("US", "DAL", servers);
      expect(result).toEqual([
        {
          type: "socks",
          username: undefined,
          password: undefined,
          host: "us-dal-2.mullvad.net",
          port: "1080",
        },
        {
          type: "socks",
          username: undefined,
          password: undefined,
          host: "us-dal-1.mullvad.net",
          port: "1080",
        },
      ]);
    });
  });

  describe("parseProxy", () => {
    test("should parse a proxy url string correctly", () => {
      const proxyStr = "socks://username:password@us-dal-1.mullvad.net:1080";
      const result = ProxyUtils.parseProxy(proxyStr);
      expect(result).toEqual({
        type: "socks",
        username: "username",
        password: "password",
        host: "us-dal-1.mullvad.net",
        port: "1080",
      });
    });

    test("should return null for an invalid proxy url string", () => {
      const proxyStr = "invalid-proxy-string";
      const result = ProxyUtils.parseProxy(proxyStr);
      expect(result).toBeNull();
    });
  });
});
