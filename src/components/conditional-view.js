/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement } from "../vendor/lit-all.min.js";

/**
 * `ConditionalView`
 *
 * Takes N elements each with a slot="" attribute,
 * the active rendered view can be controlled using slotName="slot"
 * if no view matches "slotName" the slot named "default" will be rendered.
 *
 *
 *  <conditional-view slotName="b">
 *    <h1 slot="a">Hidden</h1>
 *    <h1 slot="b">This is rendered</h1>
 *  </conditional-view>
 */

export class ConditionalView extends LitElement {
  static properties = {
    slotName: { reflect: true },
  };
  constructor() {
    super();
    this.slotName = "default";
    this.elements = new Map();
    this.elements.set("default", "");
  }

  connectedCallback() {
    super.connectedCallback();
    this.ingestChildren();
  }
  ingestChildren() {
    const elements = [...this.children];
    elements.forEach((e) => {
      e.remove();
      if (e.slot) {
        this.elements.set(e.slot, e);
      }
    });
  }

  hasSlot(slotName) {
    return this.elements.has(slotName);
  }
  getTargetSlot() {
    const slot = this.slotName;
    if (slot == "") {
      return "default";
    }
    if (!this.hasSlot(slot)) {
      return "default";
    }
    return slot;
  }
  render() {
    if (this.children.length > 1) {
      // Horrible perf, but let's make sure we don't render stuff that should not be visible.
      this.ingestChildren();
    }
    return html`${this.elements.get(this.getTargetSlot())}`;
  }
}
customElements.define("conditional-view", ConditionalView);
