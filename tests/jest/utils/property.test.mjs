/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test, jest } from "@jest/globals";
import { property, computed, propertySum } from "../../../src/shared/property";

describe("property()", () => {
  test("Can create a property from a value", () => {
    const obj = { x: "hello" };
    const prop = property(obj);
    expect(prop.value.x).toBe(obj.x);
  });
  test("Property Values are sealed", () => {
    const obj = { x: "hello" };
    const prop = property(obj);
    expect(prop.value.x).toBe(obj.x);
    try {
      obj.x = 32;
    } catch (error) {
      expect(error.toString()).toBe(
        "TypeError: Cannot assign to read only property 'x' of object '#<Object>'"
      );
    }
  });
  test("Listeners are notified of Changes", async () => {
    const obj = { x: "hello" };
    const prop = property(obj);

    let maybeValue = null;
    prop.subscribe((v) => (maybeValue = v));
    prop.set({ value: "UPDATED" });
    expect(maybeValue).not.toBeNull();
    expect(maybeValue.value).toBe("UPDATED");
  });
  test("Listeners can unsubscribe ", () => {
    const obj = { x: "hello" };
    const prop = property(obj);
    let maybeValue = null;
    const unsub = prop.subscribe((v) => (maybeValue = v));
    unsub();
    prop.set({ value: "UPDATED" });
    expect(maybeValue).toBeNull();
  });

  test("You can iterate over the values", async () => {
    const prop1 = property(false);
    (async () => {
      for await (const val of prop1) {
        if (val === true) {
          console.log("Iterator terminated.");
          return;
        }
      }
    })();
    expect(prop1.__subscriptions.length).toBe(1);
    console.log("Subscriptions before:", prop1.__subscriptions.length); // 1 subscription
    prop1.value = true;
    await new Promise((r) => setTimeout(r, 10));
    console.log("Subscriptions after:", prop1.__subscriptions.length); // Should be 0 subscription
    expect(prop1.__subscriptions.length).toBe(0);
  });
});

describe("ReadOnlyProperties", () => {
  test("Can create a ReadOnlyProperty from a Property", () => {
    const prop = property({ x: "hello" });
    const ro = prop.readOnly;
    expect(ro.value.x).toBe(prop.value.x);
  });
  test("Listeners are notified of Changes", async () => {
    const prop = property({ x: "hello" });
    const ro = prop.readOnly;

    let maybeValue = null;
    ro.subscribe((v) => (maybeValue = v));
    prop.set({ value: "UPDATED" });
    expect(maybeValue).not.toBeNull();
    expect(maybeValue.value).toBe("UPDATED");
  });
  test("Listeners can unsubscribe ", () => {
    const prop = property({ x: "hello" });
    const ro = prop.readOnly;

    let maybeValue = null;
    const unsub = ro.subscribe((v) => (maybeValue = v));
    unsub();
    prop.set({ value: "UPDATED" });
    expect(maybeValue).toBeNull();
  });
});

describe("computed()", () => {
  test("Can create a computed from a Property", () => {
    const prop = property(1);
    const computedProp = computed(prop, (num) => num * 2);
    expect(computedProp.value).toBe(2);
    prop.set(2);
    expect(computedProp.value).toBe(4);
  });
  test("Listeners are notified of Changes", async () => {
    const prop = property(1);
    const computedProp = computed(prop, (num) => num * 2);
    expect(computedProp.value).toBe(2);

    let maybeValue = null;
    computedProp.subscribe((v) => (maybeValue = v));
    prop.set(2);
    expect(maybeValue).not.toBeNull();
    expect(maybeValue).toBe(4);
  });
});

describe("propertySum", () => {
  test("Can create a property from a value", () => {
    const obj = property({ x: "hello" });
    const prop = propertySum((obj) => {
      return obj.x;
    }, obj);
    expect(prop.value.x).toBe(obj.x);
  });
  test("Calls the Transform Function in order of the props ", async () => {
    const prop1 = property("hello");
    const prop2 = property(4);
    const prop3 = property(true);
    propertySum(
      (value1, value2, value3) => {
        expect(value1).toBe(prop1.value);
        expect(value2).toBe(prop2.value);
        expect(value3).toBe(prop3.value);
      },
      prop1,
      prop2,
      prop3
    );
  });

  test("If any of the props are updated, the transform is called", async () => {
    const prop1 = property("hello");
    const prop2 = property(4);
    const prop3 = property(true);

    let count = 0;
    propertySum(
      () => {
        return count++;
      },
      prop1,
      prop2,
      prop3
    );
    // We auto scheudle the transform to compute the inital value
    expect(count).toBe(1);
    prop1.set("h");
    prop2.set("h");
    prop3.set("h");
    expect(count).toBe(4);
  });
});
