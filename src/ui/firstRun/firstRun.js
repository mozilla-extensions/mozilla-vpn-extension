/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  css,
  LitElement,
  createRef,
  ref,
} from "../../vendor/lit-all.min.js";
import {
  fontStyling,
  inCopyLink,
  resetSizing,
} from "../../components/styles.js";
import { getExposedObject } from "../../shared/ipc.js";
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
  };
  constructor() {
    super();
    this.contexts = new Map();
    this.vpnController = getExposedObject("VPNController");
    this.vpnController.then((c) => {
      c.servers.subscribe((servers) => (this.serverList = servers));
    });
    this.proxyHandler = getExposedObject("ProxyHandler");
    this.proxyHandler.then((p) => {
      p.siteContexts.subscribe((context) => (this.contexts = context));
    });
    getExposedObject("Telemetry").then((t) =>
      t.record("used_feature_settings_page")
    );
  }

  connectedCallback() {
    super.connectedCallback();
  }
  filterInput = createRef();

  render() {
    document.title = tr("Mozilla VPN");
    return html`
      <main>
        <h1>${tr("thankYouForInstalling")}</h1>
        <div class="flex-row">
          <img src="firstrun.svg" />
          <div class="copy">
            <p class="body-first">
              ${tr("first-install-body")}
              <a
                class="in-copy-link"
                href="https://addons.mozilla.org/firefox/addon/mozilla-vpn-extension/privacy/"
                >${tr("viewPrivacyPolicy")}</a
              >
            </p>

            <div class="pill-copy-wrapper">
              <p class="bold pill-copy">${tr("telemetry_toggle_text")}</p>
              <mz-pill
                .enabled=${telemetry.telemetryEnabled.value}
                @click=${(e) => {
                  telemetry.setTelemetryEnabled(
                    !telemetry.telemetryEnabled.value
                  );
                  e.target.enabled = !telemetry.telemetryEnabled.value;
                }}
              >
              </mz-pill>
            </div>
            <p>${tr("first-install-footer")}</p>
            <p>${tr("toOpenTheExtension")}</p>
          </div>
        </div>
      </main>
    `;
  }
  removeOrigin(origin) {
    this.proxyHandler.then((handler) => {
      handler.removeContextForOrigin(origin);
    });
  }

  static styles = css`
    ${fontStyling}
    ${resetSizing}
    ${inCopyLink}
    main {
      width: 100vw;
      height: 100vh;
      padding: 0 24px 24px 24px;
      display: flex;
      flex-align: center;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      max-width: 900px;
      margin-inline: auto;
      padding-block-end: 80px;
    }
    .pill-copy-wrapper,
    div.flex-row {
      display: flex;
      flex-direction: row;
    }

    img {
      margin-inline-end: 74px;
    }

    .pill-copy-wrapper {
      justify-content: space-between;
      margin-block: 32px;
      max-width: 400px;
    }

    h1 {
      margin-block-end: 72px;
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
    a {
      font-size: 16px;
      line-height: 27px;
    }

    p {
      padding-block-end: 16px;
    }

    p.body-first {
      padding-block-end: 0px;
    }
  `;
}
customElements.define("first-run", FirstRunPage);
