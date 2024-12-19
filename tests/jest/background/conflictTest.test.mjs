/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { beforeEach, describe, expect, test, jest } from "@jest/globals";

// Mock the browser API
const mockGetAll = jest.fn();
const mockOnInstalled = { addListener: jest.fn() };
const mockOnUninstalled = { addListener: jest.fn() };
const mockOnEnabled = { addListener: jest.fn() };
const mockOnDisabled = { addListener: jest.fn() };

global.browser = {
  management: {
    getAll: mockGetAll,
    onInstalled: mockOnInstalled,
    onUninstalled: mockOnUninstalled,
    onEnabled: mockOnEnabled,
    onDisabled: mockOnDisabled,
  },
};
/**
 * @returns {browser.management.ExtensionInfo}
 */
const makeExtension = (id, permissions, enabled) => {
  return {
    description: "",
    enabled: enabled,
    homepageUrl: "https://test.com",
    hostPermissions: ["<all>"],
    icons: {},
    id: id,
    installType: "normal",
    mayDisable: false,
    name: "hello",
    optionsUrl: "option",
    permissions: permissions,
    shortName: "test",
    updateUrl: "https://test.com",
    version: "2.0.0",
  };
};

import { ConflictObserver } from "../../../src/background/conflictObserver";
describe("ConflictObserver", () => {
  beforeEach(() => {
    mockGetAll.mockReset();
  });

  it("should initialize and set up event listeners", () => {
    const observer = new ConflictObserver();

    expect(mockOnInstalled.addListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
    expect(mockOnUninstalled.addListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
    expect(mockOnEnabled.addListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
    expect(mockOnDisabled.addListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it("Calls getAll on creation", async () => {
    mockGetAll.mockResolvedValue([]);
    const test = new ConflictObserver();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockGetAll).toBeCalled();
  });
  it("Calls exposes a list of conflicting addons", async () => {
    mockGetAll.mockResolvedValue([
      makeExtension("evil", "proxy", true),
      makeExtension("evil.disabled", "proxy", false),
      makeExtension("good.enabled", "management", false),
    ]);
    const test = new ConflictObserver();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockGetAll).toBeCalled();

    const addonIDs = test.conflictingAddons.value.map((a) => a.id);
    expect(addonIDs).toContain("evil");
    expect(addonIDs).toHaveLength(1);
  });
  it("Will update the list when called", async () => {
    mockGetAll.mockResolvedValue([]);
    const test = new ConflictObserver();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockGetAll).toBeCalled();
    expect(test.conflictingAddons.value).toHaveLength(0);

    mockGetAll.mockResolvedValue([
      makeExtension("evil", "proxy", true),
      makeExtension("evil.2", "proxy", true),
      makeExtension("good.enabled", "management", false),
    ]);

    test.updateList();
    await new Promise((r) => setTimeout(r, 0));
    expect(test.conflictingAddons.value).toHaveLength(2);
  });
});
