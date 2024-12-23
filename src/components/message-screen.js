/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement, when, repeat, css } from "../vendor/lit-all.min.js";
import { fontStyling } from "./styles.js";
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
 * - totalPages -> The number of pages to show in pagination
 * - currentPage -> The active page for pagination
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
    identifier: { type: String },
    totalPages: { type: Number },
    currentPage: { type: Number },
    bodyContent: { type: Object },
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
    this.identifier = "";
    this.totalPages = 0;
    this.currentPage = 0;
  }

  render() {
    let paginationIndicators = [];
    for (let i = 0; i < this.totalPages; i++) {
      paginationIndicators.push(
        i + 1 === this.currentPage ? "circle active" : "circle"
      );
    }

    return html`
      <vpn-titlebar title=${this.titleHeader}></vpn-titlebar>
      <div class="inner">
        <div class="upper">
          <img class="${this.identifier}" src="/assets/img/${this.img}" />
          <h1>${this.heading}</h1>
          <slot></slot>
        </div>
        ${when(
          paginationIndicators.length > 0,
          () => html`
            <div class="pagination">
              ${repeat(
                paginationIndicators,
                (item) => item.id,
                (item) =>
                  html` <span class="holder"
                    ><span class="${item}"></span
                  ></span>`
              )}
            </div>
          `,
          null
        )}

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
                class="secondarybtn ${this.identifier}"
                @click=${(e) => {
                  this.onSecondaryAction(this, e);
                }}
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
    ${fontStyling}

    /* Hide "Skip" on the last onboarding panel */
    .onboarding-screen-3.secondarybtn {
      visibility: hidden;
    }

    :host {
      --min-block-size: 521px;
      /* prevent the panel from shrinking vertically when there isn't as much content */
      min-block-size: var(--min-block-size);
    }
    :host,
    .inner,
    .upper,
    .lower {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .lower {
      padding-bottom: 16px;
    }
    .inner {
      width: 85%;
      justify-content: space-between;
      /* ensure the content grows vertically to fill the height of the panel */
      min-block-size: calc(var(--min-block-size) - var(--nav-height));
      margin-inline: auto;
    }
    * {
      width: 100%;
      text-align: center;
      color: var(--text-color-primary);
      font-family: var(--font-family);
    }
    img {
      margin-block: 16px;
      max-height: 140px;
    }

    img.subscribenow-message-screen,
    img.unsupported-os-message-screen,
    img.install-message-screen {
      max-block-size: 140px;
      inline-size: 280px;
    }

    img.signin-message-screen,
    img.needs-update-message-screen {
      max-block-size: 140px;
      inline-size: 140px;
      margin-block-end: 0px;
    }

    img.open-mozilla-vpn-message-screen {
      block-size: 108px;
      inline-size: 111px;
    }

    img.onboarding-screen-4 {
      margin-top: 24px;
      max-height: 68px;
      margin-bottom: 0px;
    }
    @media (prefers-color-scheme: dark) {
      img.onboarding-screen-4 {
        filter: invert();
      }
    }
    ::slotted(.row) {
      display: flex;
      flex-direction: row;
      width: 100%;
      justify-content: space-between;
      align-items: baseline;
    }

    .pagination {
      box-sizing: border-box;
      position: relative;
      width: 100%;
      margin: 0px 0px 25px;
      justify-content: center;
      right: 4px; // This must be half the width of .circle to truly center it.
    }

    .holder {
      display: inline-block;
      width: 14px;
    }

    .circle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--grey30);
      border-radius: 100%;
    }

    .active {
      background: var(--action-button-color);
    }

    h1 {
      font-family: var(--font-family-bold);
      margin-block: 16px;
      color: #3d3d3d;
      line-height: 26px;
      font-size: 24px;
    }
    .slot {
      padding: 24px 24px;
    }
    .filler {
      flex-grow: 1;
    }
    ::slotted(p) {
      margin-block: 0 24px;
      text-align: center;
      font-family: var(--font-family);
      font-size: 14px;
      font-style: normal;
      line-height: 22px;
      color: var(--grey40);
    }

    ::slotted(.footnote) {
      margin-bottom: 16px;
      inline-size: 90%;
    }
    button {
      border: none;
      height: 32px;
      margin-bottom: 8px;
    }
    .secondarybtn {
      background-color: transparent;
      color: var(--action-button-color);
      block-size: 40px;
      font-family: "Inter Semi Bold";
      font-size: 16px;
    }
    .primarybtn {
      background-color: var(--action-button-color);
      color: white;
      border-radius: 4px;
      block-size: 40px;
    }
    p {
      color: #6d6d6e;
    }

    @media (prefers-color-scheme: dark) {
      h1 {
        color: #ffffff;
      }

      ::slotted(p) {
        color: rgba(255, 255, 255, 0.6);
      }
    }
  `;
}
customElements.define("message-screen", MessageScreen);
