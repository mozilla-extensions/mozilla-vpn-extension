/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { beforeEach, describe, expect, test, jest } from "@jest/globals";

// Mock the browser API
const mockQuery = jest.fn();
const mockReload = jest.fn();

global.browser = {
  tabs: {
    query: mockQuery,
    reload: mockReload,
  },
};
const makeTab = (host, active = true, id = 0) => {
  return {
    url: `https://${host}/index.html`,
    active,
    id,
  };
};

import { TabReloader } from "../../../src/background/tabReloader";
describe("TabReloader", () => {
  describe("TabReloader::matches", () => {
    /**
     * @returns {browser.tabs.Tab}
     */
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

  describe("TabReloader::onOriginChanged", () => {
    beforeEach(() => {
      mockQuery.mockReset();
      mockReload.mockReset();
    });

    it("Only reloads an active tab", async () => {
      mockQuery.mockReturnValue(
        Promise.resolve([
          makeTab("google.com", true, 10),
          makeTab("google.com", true, 11), // we can have 2 active tabs in multiple windows
          makeTab("schmoogle.com", true, 99),
        ])
      );

      await TabReloader.onOriginChanged("google.com");
      expect(mockReload).toHaveBeenCalledTimes(2);
    });
  });
});
