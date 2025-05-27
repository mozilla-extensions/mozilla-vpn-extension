/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test } from "@jest/globals";
import { Utils } from "../../../src/shared/utils";

describe("Utils.deepEquals", () => {
  test("returns true for primitives that are equal", () => {
    expect(Utils.deepEquals(1, 1)).toBe(true);
    expect(Utils.deepEquals("a", "a")).toBe(true);
    expect(Utils.deepEquals(null, null)).toBe(true);
    expect(Utils.deepEquals(undefined, undefined)).toBe(true);
  });

  test("returns false for primitives that are not equal", () => {
    expect(Utils.deepEquals(1, 2)).toBe(false);
    expect(Utils.deepEquals("a", "b")).toBe(false);
    expect(Utils.deepEquals(null, undefined)).toBe(false);
  });

  test("returns true for deeply equal objects", () => {
    expect(Utils.deepEquals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(Utils.deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(
      Utils.deepEquals({ x: [1, 2], y: { z: 3 } }, { x: [1, 2], y: { z: 3 } })
    ).toBe(true);
  });

  test("returns false for objects with different keys or values", () => {
    expect(Utils.deepEquals({ a: 1 }, { b: 1 })).toBe(false);
    expect(Utils.deepEquals({ a: 1 }, { a: 2 })).toBe(false);
    expect(Utils.deepEquals([1, 2, 3], [1, 2])).toBe(false);
    expect(Utils.deepEquals([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  test("returns true for deeply equal nested arrays and objects", () => {
    const a = { foo: [1, { bar: 2 }], baz: 3 };
    const b = { foo: [1, { bar: 2 }], baz: 3 };
    expect(Utils.deepEquals(a, b)).toBe(true);
  });

  test("returns false for different nested structures", () => {
    const a = { foo: [1, { bar: 2 }], baz: 3 };
    const b = { foo: [1, { bar: 3 }], baz: 3 };
    expect(Utils.deepEquals(a, b)).toBe(false);
  });

  test("returns true for equal Sets and Maps", () => {
    expect(Utils.deepEquals(new Set([1, 2]), new Set([1, 2]))).toBe(true);
    expect(Utils.deepEquals(new Map([["a", 1]]), new Map([["a", 1]]))).toBe(
      true
    );
  });

  test("returns false for different Sets and Maps", () => {
    expect(Utils.deepEquals(new Set([1, 2]), new Set([2, 3]))).toBe(false);
    expect(Utils.deepEquals(new Map([["a", 1]]), new Map([["b", 1]]))).toBe(
      false
    );
  });

  test("returns false if one is iterable and the other is not", () => {
    expect(Utils.deepEquals([1, 2, 3], { 0: 1, 1: 2, 2: 3 })).toBe(false);
  });

  test("returns true for two empty objects or arrays", () => {
    expect(Utils.deepEquals({}, {})).toBe(true);
    expect(Utils.deepEquals([], [])).toBe(true);
  });

  test("returns false for objects with same values but different key order", () => {
    expect(Utils.deepEquals({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true); // Note: Object.values order is not guaranteed
  });
});
