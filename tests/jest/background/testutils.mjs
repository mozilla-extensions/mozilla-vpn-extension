/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { jest } from "@jest/globals"; // Import test and beforeEach/afterEach

// Drop in mock for browser.storage
/**
 *
 *
 * @returns A drop in mock for a browser.storage.<location>
 */
export const createMockedBrowserStore = () => {
  let mockStorageData = {};
  const mockStorage = {
    get: jest.fn(async (keys) => {
      const key = Array.isArray(keys) ? keys[0] : keys;
      // browser.storage.local.get returns an object, even if the key isn't found ({})
      // or an object with the key if found ({ dismissedAlerts: [...] })
      const result = {};
      if (key && mockStorageData.hasOwnProperty(key)) {
        result[key] = mockStorageData[key];
      }
      return Promise.resolve(result);
    }),
    set: jest.fn(async (obj) => {
      mockStorageData = { ...mockStorageData, ...obj };
      return Promise.resolve();
    }),
    remove: jest.fn(async (keys) => {
      const keysToRemove = Array.isArray(keys) ? keys : [keys];
      keysToRemove.forEach((key) => {
        delete mockStorageData[key];
      });
      return Promise.resolve();
    }),
    // Helper to clear data between tests
    clearStore: () => {
      mockStorageData = {};
    },
    // Helper to reset mock function calls
    clearMocks: () => {
      mockStorage.get.mockClear();
      mockStorage.set.mockClear();
      mockStorage.remove.mockClear();
    },
    raw: () => {
      return mockStorageData;
    },
    rawSet: (o) => {
      mockStorageData = o;
    },
  };
  return mockStorage;
};
