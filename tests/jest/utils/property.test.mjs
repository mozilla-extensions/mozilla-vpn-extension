/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test, jest } from "@jest/globals";
import { property, computed } from "../../../src/shared/property";

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
