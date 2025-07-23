/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement, css } from "../vendor/lit-all.min.js";
import { ghostButtonStyles } from "../components/styles.js";
import { tr } from "../shared/i18n.js";
import { butterBarService } from "../../ui/browserAction/backend.js";

export class ButterBar extends LitElement {
  static properties = {
    alertId: { type: String },
    alertMessage: { type: String },
    linkText: { type: String },
    linkUrl: { type: String },
  };

  constructor() {
    super();
    this.alertId = "";
    this.alertMessage = "";
    this.linkText = "";
    this.linkUrl = "";
  }

  render() {
    const openLink = (url) => {
      browser.tabs.create({ url });
      window.close();
    };

    const dismissAlert = (id) => {
      butterBarService.dismissAlert(id);
      this.dispatchEvent(new CustomEvent("resize-popup", { bubbles: true }));
    };

    return html`
      <div class="butter-bar">
        <div class="butter-bar-text">
          <p>
            ${tr(this.alertMessage)}<a
              href=""
              @click=${() => {
                openLink(this.linkUrl);
              }}
              >${tr(this.linkText)}</a
            >
          </p>
        </div>
        <button
          @click=${() => {
            dismissAlert(this.alertId);
          }}
          class="butter-bar-close ghost-btn"
          title="${tr("close")}"
          aria-label="${tr("close")}"
        >
          <img aria-hidden="true" src="./../../assets/img/close.svg" />
        </button>
      </div>
    `;
  }

  static styles = css`
    ${ghostButtonStyles}
    .butter-bar {
      margin-block-end: 16px;
      background: lch(from var(--firefox-popup) calc(l - 10) c h);
      border-radius: 4px;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      overflow: clip;
      width: 100%
      word-wrap: anywhere;
      box-sizing: border-box;
    }

    .butter-bar-text p {
      margin: 0;
      line-height: 21px;
    }

    .butter-bar-text {
      text-align: center;
      flex: 1;
      font-size: 13px;
      padding: 10px 16px;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
      justify-items: center;
      box-sizing: border-box;
      width: 280px;
    }

    button.butter-bar-close.ghost-btn {
      inline-size: 40px;
      border: none;
    }

    button.butter-bar-close.ghost-btn::before {
      border-radius: 0px;
    }

    a {
      margin-inline-start: 5px;
      font-family: "Inter Semi Bold";
      color: inherit;
    }

    a:hover {
      color: #000000;
      opacity: 1;
      transition: opacity 0.2s ease-in-out;
    }

    @media (prefers-color-scheme: dark) {
      a:hover {
        opacity: 0.7;
        color: #ffffff;
      }
      a:active {
        opacity: 0.5;
      }
      img {
        filter: invert();
      }
    }
  `;
}
customElements.define("butter-bar", ButterBar);
