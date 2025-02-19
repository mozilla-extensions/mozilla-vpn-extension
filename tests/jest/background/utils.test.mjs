/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test, jest } from "@jest/globals";
import { Utils } from "../../../src/shared/utils";

import constants from "../../../src/shared/constants";

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

  describe("getDomainName", () => {
    test.concurrent("Returns a formatted hostname when given a url", () => {
      const result = Utils.getDomainName("www.mozilla.org");
      expect(result).toBe("www.mozilla.org");
    });
    test.concurrent("Removes reader prefixes from the url", () => {
      const result = Utils.getDomainName(
        "about:reader?url=https://firefox.com"
      );
      expect(result).toBe("firefox.com");
    });
    test.concurrent(
      "Returns the string if the string is not a valid url",
      () => {
        const result = Utils.getDomainName("about:debugging");
        expect(result).toBe("about:debugging");
      }
    );
    test.concurrent(
      "Correctly formats and returns the top and second-level domain when given an eTLD+1 domain",
      () => {
        const result = Utils.getDomainName("https://www.lanacion.com.ar/");
        expect(result).toBe("lanacion.com.ar");
      }
    );
  });

  describe("getCurrentTab", () => {
    test.concurrent("Returns the current active tab", async () => {
      const mockTab = {
        id: 1,
        url: "https://example.com",
      };
      mockQuery.mockResolvedValue([mockTab]);
      const currentTab = await Utils.getCurrentTab();
      expect(currentTab).toEqual(mockTab);
    });
  });

  describe("isViableClientVersion", () => {
    test.concurrent("Empty arg -> False", () => {
      expect(Utils.isViableClientVersion()).toBe(false);
    });
    test.concurrent("Minimum Version -> True", () => {
      expect(Utils.isViableClientVersion(constants.MINIMUM_VPN_VERSION)).toBe(
        true
      );
    });
    test.concurrent("Future Version -> True", () => {
      expect(Utils.isViableClientVersion("3.99.1")).toBe(true);
    });
    test.concurrent("Past Version -> True", () => {
      expect(Utils.isViableClientVersion("1.00.1")).toBe(false);
    });
    test.concurrent("It does only compare parts", () => {
      expect(Utils.isViableClientVersion("1.00000000.1", "1.0.1")).toBe(true);
    });

    test.concurrent(
      "It throws when provided not a 3 part version for Client",
      () => {
        expect(() => {
          Utils.isViableClientVersion("1.00");
        }).toThrow();
        expect(() => {
          Utils.isViableClientVersion("1.00.0", "1.0");
        }).toThrow();
      }
    );
  });
});
