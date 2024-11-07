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
import { fontStyling, resetSizing } from "../../components/styles.js";
import { getExposedObject } from "../../shared/ipc.js";
import "./tableElement.js";
import { tr } from "../../shared/i18n.js";
import { settingTypo } from "./styles.js";
/**
 * This is the Page-Level Component for the SettingsPafe
 *
 */
export class SettingsPage extends LitElement {
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
  }

  connectedCallback() {
    super.connectedCallback();
  }
  filterInput = createRef();

  render() {
    document.title = tr("settingsPageTitle");
    // Step 1 Filter the List, so only items that include the website are here
    const filteredList = filter(this.contexts, this.filterInput.value?.value);
    // Let's render the view!
    return html`
      <header>
        <img
          class="invert_darkmode"
          src="/assets/logos/logo-wide.svg"
          alt="${tr("productName")}"
        />
      </header>
      <main>
        <h2>${tr("websitePreferences")}</h2>
        <p>${tr("settingsPageSubtitle")}</p>
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
        >
          ${this.contexts.size == 0 ? noElementPlaceHolder() : null}
        </mz-context-table>
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
    ${settingTypo}

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
      margin-bottom: 32px;
    }
    main {
      width: calc(min(70%, 920px));
    }

    picture img {
      margin: 0px 5px;
      height: 30px;
      width: 30px;
    }

    input {
      margin-bottom: 32px;
      padding: 10px 20px;
      padding-left: 30px;
      color: black;
      width: calc(max(50%, 300px));
      background-image: url("../../assets/img/search-icon.svg");
      background-position: 2.5px 6px;
      background-repeat: no-repeat;
      border: 2px solid var(--border-color);
      border-radius: 5px;
    }

    .emptyState {
      padding: 50px 10px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      max-width: 640px;
    }
    @media (prefers-color-scheme: dark) {
      .invert_darkmode {
        filter: invert();
      }
    }

    h3 {
      margin-top: 32px;
    }
    .emptyState p {
      opacity: 0.8;
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
  for (const [key] of siteContextList.entries()) {
    if (key.includes(filterString)) {
      out.push({ ...siteContextList.get(key) });
    }
  }
  return out;
};

export const noElementPlaceHolder = () => {
  return html`
    <div class="emptyState">
      <img aria-hidden="true" src="../../assets/img/country-tabs.svg" />
      <h3>${tr("headlineNoWebsitePreferences")}</h3>
      <p>${tr("noWebsitePreferencesSubText")}</p>
    </div>
  `;
};
