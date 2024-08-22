/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test, jest } from "@jest/globals";

import { TabReloader } from "../../../src/background/tabReloader";
describe("TabReloader", () => {
  describe("TabReloader::matches", () => {
    /**
     * @returns {browser.tabs.Tab}
     */
    const makeTab = (host) => {
      return {
        url: `https://${host}/index.html`,
      };
    };
    test("Returns a function", () => {
      const func = TabReloader.matches("");
      expect(typeof func).toBe("function");
    });
    test("Empty matcher will match nothing ", () => {
      const tabs = [makeTab("hello.com"), makeTab("world.com")];
      const out = tabs.filter(TabReloader.matches());
      expect(out.length).toBe(0);
    });
    test("Empty matcher will match nothing ", () => {
      const tabs = [makeTab("hello.com"), makeTab("world.com")];
      const out = tabs.filter(TabReloader.matches());
      expect(out.length).toBe(0);
    });
    test("matcher will match a hostname ", () => {
      const tabs = [makeTab("hello.com"), makeTab("world.com")];
      const out = tabs.filter(TabReloader.matches("world.com"));
      expect(out.length).toBe(1);
    });
  });
  describe("TabReloader::needsDiscard", () => {
    /**
     * @returns {browser.tabs.Tab}
     */
    const makeTestCase = (result, discarded, active, audible) => {
      return [{ discarded, active, audible }, result];
    };
    const testCases = [
      // Not discareded Background tab => true
      makeTestCase(true, false, false, false),
      // Not discarded Background tab but playing audio => false
      makeTestCase(false, false, false, true),
      // Active Tab => false (will reload)
      makeTestCase(false, false, true, false),
      // Active Tab && Playing audio  => false
      makeTestCase(false, false, true, true),
      // Discarded Tabs => False
      makeTestCase(false, true, false, false),
      makeTestCase(false, true, false, true),
      makeTestCase(false, true, true, false),
      makeTestCase(false, true, true, true),
    ];
    testCases.forEach(([o, expected]) => {
      test(`needsDiscard(${JSON.stringify(o)}) => ${expected}`, () => {
        expect(TabReloader.needsDiscard(o)).toBe(expected);
      });
    });
  });
  describe("TabReloader::needsReload", () => {
    /**
     * @returns {browser.tabs.Tab}
     */
    const makeTestCase = (result, discarded, active, audible) => {
      return [{ discarded, active, audible }, result];
    };
    const testCases = [
      // Not discareded Background tab => true
      makeTestCase(false, false, false, false),
      // Not discarded Background tab but playing audio => false
      makeTestCase(false, false, false, true),
      // Active Tab => true
      makeTestCase(true, false, true, false),
      // Active Tab && Playing audio  => *FALSE*
      makeTestCase(false, false, true, true),
      // Discarded Tabs => False
      makeTestCase(false, true, false, false),
      makeTestCase(false, true, false, true),
      makeTestCase(false, true, true, false),
      makeTestCase(false, true, true, true),
    ];
    testCases.forEach(([o, expected]) => {
      test(`needsReload(${JSON.stringify(o)}) => ${expected}`, () => {
        expect(TabReloader.needsReload(o)).toBe(expected);
      });
    });
  });
});
