/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement, when, css } from "../vendor/lit-all.min.js";
import { fontSizing } from "./styles.js";
import "./titlebar.js";

/**
 * MessageScreen
 * This is a basic message Screen component.
 * Properties:
 * - titleHeader -> The header in the Title bar
 * - heading -> The H1 Heading
 * - img -> The image in /assets/img/ to use
 * - primaryAction -> The Primary Call to action Button
 * - onPrimaryAction -> A function to call when the primary button is clicked
 * - secondaryAction -> The 2ndary button text
 * - onSecondaryAction -> A function to call when the 2ndary action is clicked.
 */

export class MessageScreen extends LitElement {
  static properties = {
    titleHeader: { type: String },
    heading: { type: String },
    img: { type: String },
    primaryAction: { type: String },
    onPrimaryAction: { type: Function },
    secondaryAction: { type: String },
    onSecondaryAction: { type: Function },
  };
  constructor() {
    super();
    this.titleHeader = "";
    this.heading = "";
    this.img = "";
    this.primaryAction = "";
    this.secondarAction = "";
    this.onPrimaryAction = () => {};
    this.onSecondaryAction = () => {};
  }

  render() {
    return html`
      <vpn-titlebar title=${this.titleHeader}></vpn-titlebar>
      <div class="inner">
        <div class="upper">
          <img src="/assets/img/${this.img}" />
          <h1>${this.heading}</h1>
          <slot></slot>
        </div>
        <div class="lower">
          ${when(
            this.primaryAction,
            () => html`
              <button
                class="primarybtn"
                @click=${(e) => {
                  this.onPrimaryAction(this, e);
                }}
              >
                ${this.primaryAction}
              </button>
            `
          )}
          ${when(
            this.secondaryAction,
            () => html`
              <button
                class="secondarybtn"
                @click=${(e) => this.onSecondaryAction(this, e)}
              >
                ${this.secondaryAction}
              </button>
            `
          )}
        </div>
      </div>
    `;
  }
  static styles = css`
    ${fontSizing}
    :host {
      width: var(--window-width);
      height: var(--window-max-height);
      contain: strict;
    }
    :host,
    .inner,
    .upper,
    .lower {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .inner {
      width: 85%;
      justify-content: space-between;
      height: 100%;
    }
    * {
      width: 100%;
      text-align: center;
      color: var(--text-color-primary);
      font-family: var(--font-family);
    }
    img {
      margin-top: 16px;
      margin-bottom: 16px;
      width: 180px;
      max-height: 80px;
    }
    h1 {
      font-family: var(--font-family-bold);
      margin-bottom: 8px;
    }
    .slot {
      padding: 24px 24px;
    }
    .filler {
      flex-grow: 1;
    }
    ::slotted(p) {
      margin: 0;
      text-align: center;
      font-family: var(--font-family);
      font-size: 15px;
      font-style: normal;
      font-weight: 400;
    }
    ::slotted(.footnote) {
      margin-top: 8px;
      margin-bottom: 8px;
    }
    button {
      border: none;
      height: 32px;
      margin-bottom: 8px;
    }
    .secondarybtn {
      background-color: transparent;
      color: var(--action-button-color);
    }
    .primarybtn {
      background-color: var(--action-button-color);
      color: white;
      border-radius: 4px;
    }
  `;
}
customElements.define("message-screen", MessageScreen);
