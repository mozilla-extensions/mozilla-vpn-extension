/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed wtesth this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  ButterBarService,
  ButterBarAlert,
} from "../../../src/background/butterBarService";

import { describe, expect } from "@jest/globals";

class TestRegister {
  registerObserver() {}
}
class TestConflictObserver {}

const testButterBarAlert = new ButterBarAlert(
  "new-alert",
  "messageString",
  "link",
  "linkUrl"
);

describe("ButterBarService", () => {
  test("Alerts are not created if conflict lists are empty", () => {
    const conflictObserver = new TestConflictObserver();
    const butterBarService = new ButterBarService(
      new TestRegister(),
      conflictObserver
    );
    const list = [];
    const newList = butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(newList).toBe(undefined);
  });

  test("Alerts can be added to the butter bar list and removed", () => {
    const conflictObserver = new TestConflictObserver();
    const butterBarService = new ButterBarService(
      new TestRegister(),
      conflictObserver
    );
    const list = [1];
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);

    butterBarService.dismissAlert("new-alert");
    expect(butterBarService.butterBarList.value.length).toBe(0);
  });

  test("Duplicate alerts are not added to the butter bar list", () => {
    const conflictObserver = new TestConflictObserver();
    const butterBarService = new ButterBarService(
      new TestRegister(),
      conflictObserver
    );
    const list = [1];
    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);

    butterBarService.maybeCreateAlert(list, testButterBarAlert);
    expect(butterBarService.butterBarList.value.length).toBe(1);
  });

  test("ButterBarService.alertWasDismissed returns true if the ID is in the provided list", () => {
    const conflictObserver = new TestConflictObserver();
    const butterBarService = new ButterBarService(
      new TestRegister(),
      conflictObserver
    );
    const list = ["someId"];
    const dismissed = butterBarService.alertWasDismissed("someId", list);
    expect(dismissed).toBe(true);
  });

  test("ButterBarService.alertWasDismissed returns false if the ID is not in the provided list", () => {
    const conflictObserver = new TestConflictObserver();
    const butterBarService = new ButterBarService(
      new TestRegister(),
      conflictObserver
    );
    const list = [];
    const dismissed = butterBarService.alertWasDismissed("someId", list);
    expect(dismissed).toBe(false);
  });

  describe("ButterBarService.alertInButterBarList", () => {
    test("Returns true if the alert ID is in the provided list", () => {
      const conflictObserver = new TestConflictObserver();
      const butterBarService = new ButterBarService(
        new TestRegister(),
        conflictObserver
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
      const conflictObserver = new TestConflictObserver();
      const butterBarService = new ButterBarService(
        new TestRegister(),
        conflictObserver
      );
      const list = [];
      const alertAlreadyInList = butterBarService.alertInButterBarList(
        "new-alert",
        list
      );
      expect(alertAlreadyInList).toBe(false);
    });
  });
});
