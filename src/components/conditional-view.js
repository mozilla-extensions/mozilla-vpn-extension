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
  }

  hasSlot(slotName) {
    return Array.from(this.children).some((e) => {
      return e.slot === slotName;
    });
  }
  getTargetSlot() {
    let slot = this.slotName;
    if (slot == "") {
      return "default";
    }
    if (!this.hasSlot(slot)) {
      return "default";
    }
    return slot;
  }
  render() {
    return html` <slot name=${this.getTargetSlot()}></slot> `;
  }
}
customElements.define("conditional-view", ConditionalView);
