/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 import { describe, expect, test, jest } from "@jest/globals";
 import { Utils } from "../../../src/background/utils";

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

  describe("getSiteContextsStorageKey", () => {
    const result = Utils.getSiteContextsStorageKey();
    expect(result).toBe("siteContexts");
    /* 
      If you've failed this test it is because you've changed the value of
      the siteContexts storage key. If this extension has already 
      shipped to the masses, Have A Think™ about how changing this storage key
      will affect existing users.
    */
  });

  describe("getFormattedHostName", () => {
    test("Returns a formatted hostname when given a url", () => {
      const result = Utils.getFormattedHostname("www.mozilla.org");
      expect(result).toBe("www.mozilla.org");
    });
    test("Removes reader prefixes from the url", () => {
      const result = Utils.getFormattedHostname("about:reader?url=https://firefox.com");
      expect(result).toBe("firefox.com");
    });
    test("Returns the string if the string is not a valid url", () => {
      const result = Utils.getFormattedHostname("about:debugging");
      expect(result).toBe("about:debugging");
    })
  });

  describe("getCurrentTab", () => {
    test("Returns the current active tab", async () => {
      const mockTab = { 
        id: 1,
        url: "https://example.com"
      };
      mockQuery.mockResolvedValue([mockTab]);
      const currentTab = await Utils.getCurrentTab();
      expect(currentTab).toEqual(mockTab);
    });
  });

  describe("getContextForOrigin", () => {
    test("Returns the context for a given origin", () => {
      const origins = new Map();
      origins.set("firefox.com", {foo: "bar"});
      const result = Utils.getContextForOrigin("firefox.com", origins);
      expect(result.foo).toBe("bar");
    });
    test("Returns undefined if there is no context for the origin", () => {
      const origins = new Map();
      origins.set("firefox.com", {foo: "bar"});
      const result = Utils.getContextForOrigin("mozilla.org", origins);
      expect(result).toBeUndefined();
    });
  });
});