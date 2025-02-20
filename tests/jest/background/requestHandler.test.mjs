/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { beforeEach, describe, expect, test, jest } from "@jest/globals";
import { RequestHandler } from "../../../src/background/requestHandler";

describe("RequestHandler", () => {
  const browserSetting = {
    levelOfControl: "controllable_by_this_extension",
    value: {
      proxyType: "none",
      autoConfigUrl: "",
      autoLogin: false,
      proxyDNS: true,
      httpProxyAll: false,
      socksVersion: 5,
      passthrough: "",
      http: "",
      ssl: "",
      socks: "al-tia-wg-socks5-001.relays.mullvad.net:1080",
    },
  };
  const currentExitRelays = [
    {
      type: "socks",
      host: "de-ber-wg-socks5-001.relays.mullvad.net",
      port: "1080",
    },
    {
      type: "socks",
      host: "de-ber-wg-socks5-002.relays.mullvad.net",
      port: "1080",
    },
    {
      type: "socks",
      host: "de-ber-wg-socks5-003.relays.mullvad.net",
      port: "1080",
    },
  ];
  const extState = {
    state: "Enabled",
    enabled: true,
    connecting: false,
    bypassTunnel: false,
    useExitRelays: false,
    connectedSince: 1739875894158,
  };

  describe("RequestHandler::toDefaultProxyInfo", () => {
    test("When a Browser Proxy is set, it will always return a relay list", () => {
      const res = RequestHandler.toDefaultProxyInfo(
        browserSetting,
        {
          ...extState,
          useExitRelays: true,
        },
        currentExitRelays
      );
      expect(res).toBe(currentExitRelays);
    });
    test("If no Browser Proxy is set, it will respect extState.useExitRelays ", () => {
      const res = RequestHandler.toDefaultProxyInfo(
        {
          levelOfControl: "controllable_by_this_extension",
          value: {
            ...browserSetting.value,
            proxyType: "manual",
          },
        },
        extState,
        currentExitRelays
      );
      expect(res).toBe(currentExitRelays);

      const res2 = RequestHandler.toDefaultProxyInfo(
        browserSetting,
        {
          ...extState,
          useExitRelays: false,
        },
        currentExitRelays
      );
      expect(res2).toStrictEqual({
        type: "direct",
      });
    });
  });
});
