/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test, jest } from "@jest/globals";
import { Utils } from "../../../src/shared/utils";

// Mock the browser API
const mockQuery = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();

global.browser = {
  tabs: {
    query: mockQuery,
  },
  storage: {
    local: {
      get: mockGet,
      set: mockSet,
    },
  },
};

describe("Utils", () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockGet.mockClear();
    mockSet.mockClear();
  });

  describe("getFormattedHostName", () => {
    test("Returns a formatted hostname when given a url", () => {
      const result = Utils.getFormattedHostname("www.mozilla.org");
      expect(result).toBe("www.mozilla.org");
    });
    test("Removes reader prefixes from the url", () => {
      const result = Utils.getFormattedHostname(
        "about:reader?url=https://firefox.com"
      );
      expect(result).toBe("firefox.com");
    });
    test("Returns the string if the string is not a valid url", () => {
      const result = Utils.getFormattedHostname("about:debugging");
      expect(result).toBe("about:debugging");
    });
  });

  describe("getCurrentTab", () => {
    test("Returns the current active tab", async () => {
      const mockTab = {
        id: 1,
        url: "https://example.com",
      };
      mockQuery.mockResolvedValue([mockTab]);
      const currentTab = await Utils.getCurrentTab();
      expect(currentTab).toEqual(mockTab);
    });
  });
});
