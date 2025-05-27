/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, css, LitElement } from "../vendor/lit-all.min.js";

/**
 *  Renders an actionable Title Bar
 *  with optional Buttons on the left and right
 *
 *  <vpn-titlebar title="Mozilla VPN">
 *      <button slot="left"> Button On the Left Side</button>
 *      <button slot="right"> Button On the Right Side</button>
 *  </vpn-titlebar>
 *
 *
 */
export class TitleBar extends LitElement {
  static properties = {
    title: {
      type: String,
      reflect: true,
    },
  };
  render() {
    return html`
      <nav>
        <div class="slots">
          <slot name="left"></slot>
        </div>
        <h1>${this.title}</h1>
        <div class="slots">
          <slot name="right"></slot>
        </div>
      </nav>
    `;
  }
  static styles = css`
    :host {
      font-size: 1rem;
      font-family: var(--font-family);
      --default-padding: 16px;
      background-color: --var(--panel-bg-color);
    }
    * {
      color: var(--text-color-primary);
    }
    h1 {
      flex: 10;
      margin: 0;
      font-size: 16px;
      line-height: 24px;
      font-family: "Inter Semi Bold";
      grid-column: 2/3;
      font-weight: normal;
      color: var(--text-color-headline);
    }
    nav {
      display: grid;
      grid-template-columns: 1fr 5fr 1fr;
      grid-template-rows: 1fr;
      grid-column-gap: 16px;
      grid-row-gap: 0px;

      justify-items: center;
      align-items: center;
      block-size: var(--nav-height);
      padding: 0px 16px;
      border-bottom: 1px solid var(--grey10);
    }
  `;
}
customElements.define("vpn-titlebar", TitleBar);
