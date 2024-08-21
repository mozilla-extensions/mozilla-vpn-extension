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

import * as parts from "./parts.js";

/**
 * This is the Page-Level Component for the SettingsPafe
 *
 */
export class SettingsPage extends LitElement {
  static properties = {
    contexts: { type: Object },
    sortingKey: { type: String },
    sortingAcending: { type: Boolean },
  };
  constructor() {
    super();
    this.contexts = new Map();
    this.sortingKey = "origin";
    this.sortingAcending = true;
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

  sorters = {
    origin: (a, b) => a.origin.localeCompare(b.origin),
    city: (a, b) => a.cityCode.localeCompare(b.cityCode),
    excluded: (a, b) => a.excluded - b.excluded,
  };

  filterInput = createRef();

  #setSorting(key, acending) {
    (this.sortingKey = key), (this.sortingAcending = acending);
  }

  render() {
    // Step 1 Filter the List, so only items that include the website are here
    const filteredList = parts.filter(
      this.contexts,
      this.filterInput.value?.value
    );
    // Step 2 Select the active sorter,
    // if decending wrap it in a function swapping the inputs
    let sorter = this.sortingAcending
      ? this.sorters[this.sortingKey]
      : (a, b) => this.sorters[this.sortingKey](b, a);
    // Sort it!
    const sortedList = filteredList.sort(sorter);
    // Let's render the view!
    return html`
      <header>
        <picture class="icon">
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
          <img src="../../assets/logos/logo-dark.svg" />
        </picture>
        <h1>Mozilla VPN</h1>
      </header>
      <main>
        <h2>Website Preferences</h2>
        <p>
          You can manage VPN preferences for each website in the Mozilla VPN for
          Firefox extension.
        </p>
        <div>
          <img />
          <input
            type="text"
            placeholder="Search Websites"
            ${ref(this.filterInput)}
            @change=${() => this.requestUpdate()}
            @input=${() => this.requestUpdate()}
          />
        </div>
        <div class="tableHolder">
          <table>
            ${parts.tableHeading(
              this.sortingKey,
              this.sortingAcending,
              this.#setSorting.bind(this)
            )}
            ${sortedList.map((c) => parts.tableRow(c, this.serverList))}
          </table>
          ${parts.noElementPlaceHolder(this.contexts)}
        </div>
      </main>
    `;
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
    .tableHolder {
      background: lch(from var(--panel-bg-color) calc(l + 5) c h);
      border: 1px solid var(--border-color);
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .tableHolder table {
      width: 100%;
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
    .tableHeader {
      height: 56px;
    }
    .tableHeader th {
      text-align: left;
      padding-left: 16px;
    }

    .emptyState {
      padding: 50px 10px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    h3 {
      font-size: 24px;
      font-style: normal;
      font-weight: 700;
      line-height: 26px;
      margin-bottom: 16px;
    }
    main p {
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 21px;
    }

    .tableHolder th {
      background-color: var(--panel-bg-color);
    }
    .tableHolder th button {
      background-color: transparent;
      border: none;
      position: relative;
    }
    .tableHolder th button.sorted-down::after {
      content: " ";
      position: absolute;
      top: -5px;
      background-image: url("../../assets/img/arrow-toggle.svg");
      background-position: center center;
      background-repeat: no-repeat;
      margin-inline-start: 8px;
      pointer-events: none;
      transform: rotate(0deg);
      transition: transform 0.275s ease-in-out;
      inline-size: 24px;
      height: 24px;
    }
    .tableHolder th button.sorted-up::after {
      content: " ";
      position: absolute;
      top: -5px;
      background-image: url("../../assets/img/arrow-toggle.svg");
      background-position: center center;
      background-repeat: no-repeat;
      margin-inline-start: 8px;
      pointer-events: none;
      transform: rotate(180deg);
      transition: transform 0.275s ease-in-out;
      inline-size: 24px;
      height: 24px;
    }
    .tableHolder td {
      padding: 16px;
    }
  `;
}
customElements.define("mz-settingspage", SettingsPage);
