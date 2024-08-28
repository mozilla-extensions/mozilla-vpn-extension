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
import { fontSizing, resetSizing } from "../../components/styles.js";
import { getExposedObject } from "../../shared/ipc.js";
import "./tableElement.js";
import { tr } from "../../shared/i18n.js";
/**
 * This is the Page-Level Component for the SettingsPafe
 *
 */
export class SettingsPage extends LitElement {
  static properties = {
    contexts: { type: Object },
  };
  constructor() {
    super();
    this.contexts = new Map();
    this.vpnController = getExposedObject("VPNController");
    this.vpnController.then((c) => {
      c.state.subscribe((state) => (this.serverList = state.servers));
    });
    this.proxyHandler = getExposedObject("ProxyHandler");
    this.proxyHandler.then((p) => {
      p.siteContexts.subscribe((context) => (this.contexts = context));
    });
  }

  connectedCallback() {
    super.connectedCallback();
  }
  filterInput = createRef();

  render() {
    // Step 1 Filter the List, so only items that include the website are here
    const filteredList = filter(this.contexts, this.filterInput.value?.value);
    // Let's render the view!
    return html`
      <header>
        <picture class="icon" alt="${tr("productName")}">
          <!-- User prefers light mode: -->
          <source
            srcset="../../assets/logos/logo-dark.svg"
            media="(prefers-color-scheme: light)"
          />
          <!-- User prefers dark mode: -->
          <source
            srcset="../../assets/logos/logo-light.svg"
            media="(prefers-color-scheme: dark)"
          />
          <!-- User has no color preference: -->
          <img
            src="../../assets/logos/logo-dark.svg"
            alt="${tr("productName")}"
          />
        </picture>
        <h1>${tr("productName")}</h1>
      </header>
      <main>
        <h2>${tr("headlineWebsitePreferences")}</h2>
        <p>
          <!-- TODO: Check if those strings are the ones we want to publish. -->
          You can manage VPN preferences for each website in the Mozilla VPN for
          Firefox extension.
        </p>
        <div>
          <img />
          <input
            type="text"
            placeholder=${tr("placeholderSearchWebsites")}
            ${ref(this.filterInput)}
            @change=${() => this.requestUpdate()}
            @input=${() => this.requestUpdate()}
          />
        </div>
        <mz-context-table
          .contexts=${filteredList}
          .serverList=${this.serverList}
          .onRemoveOrigin=${this.removeOrigin.bind(this)}
        ></mz-context-table>
      </main>
    `;
  }
  removeOrigin(origin) {
    this.proxyHandler.then((handler) => {
      handler.removeContextForOrigin(origin);
    });
  }

  static styles = css`
    ${fontSizing}
    ${resetSizing}

  body {
      width: var(--window-width);
      background-color: var(--panel-bg-color);
      padding: 0;
      margin: 0;
    }

    :host {
      background-color: var(--panel-bg-color);
      display: block;
      width: 100%;
      height: 100vh;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    * {
      color: var(--text-color-primary);
    }
    header {
      display: flex;
      flex-direction: row;
      padding: 20px 30px;
      border-bottom: 1px solid var(--border-color);
      width: 100%;
      margin-bottom: 16px;
    }
    main {
      width: calc(min(70%, 920px));
    }

    picture img {
      margin: 0px 5px;
      height: 30px;
      width: 30px;
    }

    h2 {
      font-size: 38px;
      font-style: normal;
      font-weight: 700;
      line-height: 40px; /* 105.263% */
      margin-bottom: 18px;
    }
    p {
      font-size: 16px;
      font-style: normal;
      font-weight: 400;
      line-height: 169.336%;
      margin-bottom: 32px;
    }
    input {
      margin-bottom: 32px;
      padding: 10px 20px;
      padding-left: 30px;
      color: var(--text-color-invert);
      width: calc(max(50%, 300px));
      background-image: url("../../assets/img/search-icon.svg");
      background-position: 2.5px 6px;
      background-repeat: no-repeat;
      border: 2px solid var(--border-color);
      border-radius: 5px;
    }

    main p {
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 21px;
    }
  `;
}
customElements.define("mz-settingspage", SettingsPage);

/**
 * Takes a map of sitecontexts
 * @param {Map<String,SiteContext>} siteContextList
 */
export const filter = (siteContextList, filterString = "") => {
  const out = [];
  siteContextList.keys().forEach((key) => {
    if (key.includes(filterString)) {
      out.push({ ...siteContextList.get(key) });
    }
  });
  return out;
};
