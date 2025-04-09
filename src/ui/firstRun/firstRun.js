/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, css, LitElement } from "../../vendor/lit-all.min.js";
import {
  fontStyling,
  inCopyLink,
  resetSizing,
  primaryBtn,
} from "../../components/styles.js";
import { tr } from "../../shared/i18n.js";
import "../../components/mz-pill.js";
import { telemetry } from "../../ui/browserAction/backend.js";
/**
 * This is the Page-Level Component for the SettingsPafe
 *
 */
export class FirstRunPage extends LitElement {
  static properties = {
    contexts: { type: Object },
    serverList: { type: Object },
    telemEnabled: { type: Boolean },
  };
  constructor() {
    super();

    telemetry.telemetryEnabled.subscribe((s) => {
      this.telemEnabled = s;
    });
  }

  connectedCallback() {
    super.connectedCallback();

    // Once on the first run enable telemetry by default.
    telemetry.setTelemetryEnabled(true);
  }

  render() {
    document.title = "Mozilla VPN";
    return html`
      <main>
        <h1>${tr("thankYouForAdding")}</h1>
        <div class="flex-row">
          <img src="firstrun.svg" aria-hidden="true" />
          <div class="copy">
            <p class="bold p1">${tr("optionalDataCollection")}</p>
            <p class="p1">${tr("first-install-body")}</p>

            <p>${tr("telemetryListHeader")}</p>
            <ul>
              <li>${tr("technicalData")}</li>
              <li>${tr("interactionData")}</li>
            </ul>

            <p class="p1">
              ${tr("privacyPolicyIntro")}
              <a
                class="in-copy-link"
                href="https://addons.mozilla.org/firefox/addon/mozilla-vpn-extension/privacy/"
                >${tr("viewPrivacyPolicy")}</a
              >
            </p>

            <p class="p1">${tr("telemetryOptOutInstructions")}</p>

            <div class="checkbox-copy-wrapper">
              <input
                type="checkbox"
                .checked=${this.telemEnabled}
                @click=${(e) => {
                  telemetry.setTelemetryEnabled(!this.telemEnabled);
                  e.target.checked = !this.telemEnabled;
                }}
              />
              <label class="pill-copy">${tr("telemetryCheckboxLabel")}</label>
            </div>
            <div class="footer bold">
              <button
                class="primarybtn"
                @click=${async (e) => {
                  browser.browserAction.openPopup();
                  const tab = await browser.tabs.getCurrent();
                  browser.tabs.remove(tab.id);
                }}
              >
                ${tr("next")}
              </button>
            </div>
          </div>
        </div>
      </main>
    `;
  }

  static styles = css`
    ${fontStyling}
    ${resetSizing}
    ${inCopyLink}
    ${primaryBtn}
    
    main {
      width: 100vw;
      min-height: 100vh;
      padding: 80px 24px 80px 24px;
      display: flex;
      flex-align: center;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      max-width: 1100px;
      margin-inline: auto;
    }

    input {
      margin-inline-end: 8px;
    }

    ul {
      margin-block-end: 16px;
      padding-inline-start: 16px;
      list-style: disc;
    }

    .pill-copy-wrapper,
    div.flex-row {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
    }

    .p1,
    ul {
      margin-block-end: 24px;
    }

    img {
      margin-inline-end: 32px;
      margin-block-start: 32px;
      max-inline-size: 300px;
    }

    .checkbox-copy-wrapper {
      margin-block: 32px;
      display: flex;
      flex-direction: row;
    }

    h1 {
      margin-block-end: 32px;
      font-size: 40px;
      line-height: 50px;
      text-align: center;
      max-inline-size: 600px;
    }

    .bold {
      font-family: "Inter Semi Bold";
    }

    .pill-copy {
      padding-right: 24px;
      padding-bottom: 0px;
      display: flex;
      align-items: center;
    }

    p,
    a,
    li {
      font-size: 16px;
      line-height: 27px;
    }

    .primarybtn {
      inline-size: auto;
      padding: 0 32px;
    }

    .footer {
      padding-block-start: 32px;
      border-top: 1px solid black;
    }

    @media (prefers-color-scheme: dark) {
      h1 {
        color: var(--firefox-popup_text);
      }
      p.bold,
      a,
      li,
      label {
        color: var(--firefox-popup_text);
      }
      p,
      li {
        color: var(--firefox-popup_text);
      }
      .footer {
        border-color: var(--firefox-popup_text);
      }
    }

    @media only screen and (max-width: 900px) {
      div.flex-row {
        flex-direction: column !important;
      }

      main {
        padding: 48px;
        height: auto;
      }
      img {
        margin-block-end: 48px;
        margin-inline: auto;
      }
    }
  `;
}
customElements.define("first-run", FirstRunPage);
