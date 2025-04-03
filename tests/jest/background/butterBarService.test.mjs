/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import {
  ButterBarService,
  ButterBarAlert,
} from "../../../src/background/butterBarService";

import {
  describe,
  expect,
  jest,
  test,
  beforeEach,
  afterEach,
} from "@jest/globals"; // Import test and beforeEach/afterEach

import { createMockedBrowserStore } from "./testutils.mjs";

class TestRegister {
  registerObserver() {}
}

// Minimal mocks needed just to avoid errors during instantiation/init
const mockConflictObserver = {
  updateList: jest.fn().mockResolvedValue(undefined),
  conflictingAddons: { subscribe: jest.fn() },
};
const mockVpnController = {
  interventions: { subscribe: jest.fn() },
};

const testButterBarAlert = new ButterBarAlert(
  "new-alert",
  "messageString",
  "link",
  "linkUrl"
);

const mockStorage = createMockedBrowserStore();

global.browser = {
  storage: {
    local: mockStorage,
  },
};

describe("ButterBarService", () => {
  // Use beforeEach to reset storage mock state for isolation
  beforeEach(() => {
    mockStorage.clearStore();
    mockStorage.clearMocks();
  });

  test("Alerts are not created if conflict lists are empty", () => {
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );
    const list = [];
    // maybeCreateAlert doesn't return anything, test the side effect
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value).toEqual([]); // Check the list state
  });

  test("Alerts can be added to the butter bar list and removed", async () => {
    // Made async for dismissAlert
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );
    const list = [1];
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);

    await butterBarService.dismissAlert("new-alert");
    expect(butterBarService.butterBarList.value.length).toBe(0);
    // Also check dismissed list (related to storage interaction)
    expect(butterBarService.dismissedAlerts).toContain("new-alert");
  });

  test("Duplicate alerts are not added to the butter bar list", () => {
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );
    const list = [1];
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);

    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);
  });

  test("Alerts are removed when the conflict that triggered them is gone", () => {
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );

    let list = [1];
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);

    list = [];
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(0);
  });

  test("Alerts are only added to the dismissed list when dismissed from the UI", async () => {
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );

    let list = [1];
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);

    // Use removeAlert (doesn't dismiss/save)
    butterBarService.removeAlert(testButterBarAlert.alertId);
    expect(butterBarService.dismissedAlerts.length).toBe(0);

    // Now dismiss an alert to ensure dismissedAlerts *can* be populated
    const secondAlert = new ButterBarAlert("second", "m", "l", "u");
    butterBarService.maybeCreateAlert([1], secondAlert); // Add another alert
    await butterBarService.dismissAlert(secondAlert.alertId); // Dismiss it
    expect(butterBarService.dismissedAlerts.length).toBe(1); // Should contain 'second'
    expect(butterBarService.dismissedAlerts).not.toContain(
      testButterBarAlert.alertId
    ); // Original should not be there
  });

  test("Removed (but not dismissed) alerts are shown in the UI if the same conflict resurfaces", () => {
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );

    let list = [1];
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);

    // Use removeAlert (not dismissAlert)
    butterBarService.removeAlert(testButterBarAlert.alertId);
    expect(butterBarService.dismissedAlerts.length).toBe(0);

    // Conflict resurfaces
    butterBarService.maybeCreateAlert([1], testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1); // Should reappear
  });

  test("ButterBarService.alertWasDismissed returns true if the ID is in the provided list", () => {
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );
    const list = ["someId"];
    const dismissed = butterBarService.alertWasDismissed("someId", list);
    expect(dismissed).toBe(true);
  });

  test("ButterBarService.alertWasDismissed returns false if the ID is not in the provided list", () => {
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );
    const list = [];
    const dismissed = butterBarService.alertWasDismissed("someId", list);
    expect(dismissed).toBe(false);
  });

  describe("ButterBarService.alertInButterBarList", () => {
    test("Returns true if the alert ID is in the provided list", () => {
      const butterBarService = new ButterBarService(
        new TestRegister(),
        mockVpnController,
        mockConflictObserver
      );

      const list = [];
      list.push(testButterBarAlert);

      const alertAlreadyInList = butterBarService.alertInButterBarList(
        "new-alert",
        list
      );
      expect(alertAlreadyInList).toBe(true);
    });

    test("Returns false if the alert ID is not in the provided list", () => {
      const butterBarService = new ButterBarService(
        new TestRegister(),
        mockVpnController,
        mockConflictObserver
      );
      const list = [];
      const alertAlreadyInList = butterBarService.alertInButterBarList(
        "new-alert",
        list
      );
      expect(alertAlreadyInList).toBe(false);
    });
  });
  test("dismissAlert correctly updates browser.storage.local", async () => {
    // Arrange
    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );
    const alertIdToDismiss = "alert-1";
    // Add the alert to the list first so the filter works
    butterBarService.butterBarList.set([
      {
        alertId: alertIdToDismiss,
        alertMessage: "m",
        linkText: "l",
        linkUrl: "u",
      },
    ]);
    // Simulate some pre-existing dismissed alerts
    butterBarService.dismissedAlerts = ["existing-alert"];

    await butterBarService.dismissAlert(alertIdToDismiss);

    // Assert
    // 1. Check the internal state
    expect(butterBarService.dismissedAlerts).toEqual([
      "existing-alert",
      alertIdToDismiss,
    ]);
    // 2. Check the mock storage call
    expect(mockStorage.set).toHaveBeenCalledTimes(1);
    expect(mockStorage.set).toHaveBeenCalledWith({
      dismissedAlerts: ["existing-alert", alertIdToDismiss], // Should preserve existing and add new
    });
    // 3. Check the storage data itself
    expect(mockStorage.raw().dismissedAlerts).toEqual([
      "existing-alert",
      alertIdToDismiss,
    ]);
  });

  test("init correctly loads dismissedAlerts from browser.storage.local", async () => {
    // Arrange: Set up storage *before* calling init
    const initialDismissed = ["dismissed-1", "dismissed-2"];
    mockStorage.rawSet({ dismissedAlerts: initialDismissed });

    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );

    // Act: Call the init method which internally calls loadDismissedAlerts
    await butterBarService.init();

    // Assert
    // 1. Check the mock storage call
    expect(mockStorage.get).toHaveBeenCalledTimes(1);
    expect(mockStorage.get).toHaveBeenCalledWith("dismissedAlerts");
    // 2. Check that the service's internal state was updated
    expect(butterBarService.dismissedAlerts).toEqual(initialDismissed);
  });

  test("init handles empty storage for dismissedAlerts", async () => {
    // Arrange: Ensure storage is empty (or key doesn't exist)
    mockStorage.clearStore();

    const butterBarService = new ButterBarService(
      new TestRegister(),
      mockVpnController,
      mockConflictObserver
    );

    // Act
    await butterBarService.init();

    // Assert
    expect(mockStorage.get).toHaveBeenCalledTimes(1);
    expect(mockStorage.get).toHaveBeenCalledWith("dismissedAlerts");
    // Should default to an empty array if nothing is found
    expect(butterBarService.dismissedAlerts).toEqual([]);
  });
});
