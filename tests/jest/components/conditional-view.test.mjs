/**
 * @jest-environment jsdom
 */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test } from "@jest/globals";
import {
  render,
  html,
  ref,
  createRef,
} from "../../../src/vendor/lit-all.min.js";

import { ConditionalView } from "../../../src/components/conditional-view.js";

describe("ConditionalView", () => {
  test("use jsdom in this test file", () => {
    const element = document.createElement("div");
    expect(element).not.toBeNull();
  });
  test("can we crate a conditional-view", () => {
    const element = document.createElement("conditional-view");
    document.body.append(element);
    // Make sure importing the Module registers the custom element
    expect(customElements.get("conditional-view")).toBe(ConditionalView);
    // Make sure once adopted to the dom it has rendered into a shadowdom
    expect(element.shadowRoot).not.toBeNull();
  });
  test("It selects the proper thing", async () => {
    const element = document.createElement("conditional-view");
    document.body.append(element);
    render(
      html`
        <h1 slot="hidden">this is hidden</h1>
        <h1 slot="visible">this is visible</h1>
      `,
      element
    );
    element.slotName = "visible";
    await element.requestUpdate();
    const slot = element.shadowRoot.querySelector("slot");
    const selectedHeader = slot.assignedNodes()[0];

    expect(selectedHeader.textContent).toBe("this is visible");
  });
  test("It selects the default slot if none match", async () => {
    const element = document.createElement("conditional-view");
    document.body.append(element);
    render(
      html`
        <h1 slot="hidden">this is hidden</h1>
        <h1 slot="visible">this is visible</h1>
        <h1 slot="default">this is default</h1>
      `,
      element
    );
    element.slotName = "this-slot-does-not-exist";
    await element.requestUpdate();
    const slot = element.shadowRoot.querySelector("slot");
    const selectedHeader = slot.assignedNodes()[0];

    expect(selectedHeader.textContent).toBe("this is default");
  });
});
