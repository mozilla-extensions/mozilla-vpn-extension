/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  css,
  LitElement,
  render,
  createRef,
  ref,
} from "../../vendor/lit-all.min.js";

import { ready } from "./backend.js";

import { fontSizing, resetSizing } from "../../components/styles.js";

// Other components used
import "./../../components/stackview.js";
import "./../../components/serverlist.js";
import "./../../components/vpncard.js";
import "./../../components/titlebar.js";

/**
 * @typedef {import("../../background/vpncontroller/states.js").VPNState} VPNState
 */

/**
 * This is the Component for the Browser Action Popup. #
 *
 * It will establish a connection to the backend script
 * feed data downwards to the components and send component events upwards
 * to the backend script.
 */
export class BrowserActionPopup extends LitElement {
  static properties = {
    vpnState: { type: Object },
    pageURL: { type: String },
  };

  constructor() {
    super();
    this.pageURL = "about:blank";

    // Hook up the Controller Port to check the VPN Status
    // and get the ServerList
    /** @type {VPNState} */
    this.vpnState = null;
    this.controllerPort = globalThis.chrome.runtime.connect({
      name: "vpncontroller",
    });
    this.controllerPort.onMessage.addListener((state) => {
      console.log(state);
      this.vpnState = state;
    });

    // Get the Page URL that is active at the time of opening the popup
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let activeTab = tabs[0];
      let domain = new URL(activeTab.url);
      console.log(domain);
      this.pageURL = domain;
    });
  }
  connectedCallback() {
    super.connectedCallback();
  }

  /**
   * Ref's are Elements we want to keep track of
   */
  stackView = createRef();

  render() {
    const back = () => {
      this.stackView?.value?.pop().then(() => {
        this.requestUpdate();
      });
    };
    const canGoBack = (() => {
      if (!this.stackView.value) {
        return false;
      }
      return this.stackView?.value?.count > 1;
    })();
    let title = this.stackView?.value?.currentElement?.dataset?.title;
    title ??= "Mozilla VPN";

    return html`
      <vpn-titlebar title="${title}" ${ref(this.titleBar)}>
        ${canGoBack ? BrowserActionPopup.backBtn(back) : null}
        <img slot="right" src="../../assets/img/settings-cog.svg" />
      </vpn-titlebar>
      <stack-view ${ref(this.stackView)}>
        <section data-title="Mozilla VPN">
          <main>
            <vpn-card
              .enabled=${this.vpnState?.connected}
              .cityName=${this.vpnState?.exitServerCity.name}
              .countryFlag=${this.vpnState?.exitServerCountry.code}
            ></vpn-card>
            ${this.locationSettings()}
          </main>
        </section>
      </stack-view>
    `;
  }

  locationSettings() {
    if (!BrowserActionPopup.canShowLocationSettings(this.pageURL)) {
      return null;
    }
    const url = new URL(this.pageURL);
    return BrowserActionPopup.sitePrefrencesTemplate(
      this.openServerList.bind(this),
      url.hostname
    );
  }

  openServerList() {
    const onSelectServerResult = (event) => {
      this.stackView.value?.pop().then(() => {
        this.requestUpdate();
      });
      const city = event?.detail?.city;
      if (city) {
        // TODO: Set the City
      }
    };
    const serverListElement = BrowserActionPopup.createServerList(
      this.vpnState.servers,
      onSelectServerResult
    );
    this.stackView.value?.push(serverListElement).then(() => {
      this.requestUpdate();
    });
  }

  static sitePrefrencesTemplate(openServerList = () => {}, origin = "") {
    return html`
      <h1>Preferences for this site</h1>
      <div class="row">
        <input type="checkbox" />
        <p>Always turn off VPN protection for <b>${origin}</b></p>
      </div>
      <h2>Select site location</h2>
      <div class="row" id="selectPageLocation" @click=${openServerList}>
        <img src="../../assets//flags/CA.png" height="24" width="24" />
        <p>Toronto</p>
        <img
          src="../../assets/img/arrow-icon-right.svg"
          height="12"
          width="12"
          class="arrow"
        />
      </div>
      <button id="selectLocation">Reset Site Prefrences</button>
    `;
  }
  static backBtn(back) {
    return html`<img
      slot="left"
      src="../../assets/img/arrow-icon-left.svg"
      @click=${back}
    />`;
  }

  /**
   * Returns true if the Current URL can have a Site-Specific Location
   * @param {*} pageURL - The Current website
   * @returns
   */
  static canShowLocationSettings(pageURL = "about:blank") {
    if (!URL.canParse(pageURL)) {
      return false;
    }
    const url = new URL(pageURL);
    // No http/s nothing to show influence.
    // i.e data url's or about://
    if (!(url.protocol === "https:" || url.protocol === "http:")) {
      return false;
    }
    // TODO: Check if we have more restrictions,
    // i remember there was a restricted url list, somewhere of pages
    // we cannot interact with i.e accounts.mozilla.org
    return true;
  }

  /**
   *
   * @param { import("./../../components/serverlist.js").ServerCountryList } list - The ServerList to Render
   * @param {($0: Event)=>{} } onResult - A callback fired when a city or "back" is clicked.
   *                                    - Contains an HTML Event with Optinal
   *                                    - { detail.city : ServerCity }
   * @returns {HTMLElement} - An already rendered Element, ready to put into the DOM
   */
  static createServerList(list = [], onResult = () => {}) {
    const viewElement = document.createElement("section");
    viewElement.dataset.title = "Select Location";
    render(
      html`
        <server-list .serverList=${list} @selectedCityChanged=${onResult}>
        </server-list>
      `,
      viewElement
    );
    return viewElement;
  }

  static styles = css`
    ${fontSizing}${resetSizing}
    section {
      background-color: var(--panel-bg-color);
    }

    main {
      padding: var(--padding-default);
    }
    * {
      color: var(--text-color-primary);
      font-family: var(--font-family);
    }
    .row {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .row p {
      flex: 1;
      flex-grow: 1;
    }
    .row img:first-child {
      margin-right: var(--padding-default);
    }
    .row img:last-of-type {
      margin-left: var(--padding-default);
    }
    #selectPageLocation {
      transition: all 0.15s ease;
      background: transparent;
      border-radius: 10px;
      padding: calc(var(--padding-default) / 2) 0px;
      position: relative;
    }
    #selectPageLocation:hover {
      cursor: default;
    }
    #selectPageLocation:hover::before {
      content: " ";
      opacity: 0.9;
    }
    #selectPageLocation::before {
      content: " ";
      z-index: -1;
      opacity: 0;
      background: lch(from var(--panel-bg-color) calc(l - 15) c h);
      transform: all 0.5s ease;
      background: white;
      width: 105%;
      height: 105%;
      border-radius: 5px;
      position: absolute;
      top: -2.5%;
      left: -2.5%;
    }

    vpn-card {
      display: block;
      margin-bottom: calc(var(--padding-default) * 1);
    }
    h1,
    h2,
    h3 {
      margin-top: calc(var(--padding-default) / 2);
      margin-bottom: calc(var(--padding-default) / 2);
    }

    input {
      width: 20px;
      height: 20px;
      border: 1px solid var(--border-color);
      background-color: var(--panel-bg-color);
    }
    input + p {
      margin-left: var(--padding-default);
    }

    button {
      width: 100%;
      border-radius: 4px;
      padding: 8px, 16px, 8px, 16px;
      size: 16px;
      font-weight: 600;
      border: 1px solid var(--action-button-color);
      color: var(--action-button-color);
      background-color: transparent;
      padding: 10px;
      margin-top: var(--padding-default);
    }

    .disabled {
      cursor: not-allowed;
      pointer-events: none;
      opacity: 0.5;
    }

    @media (prefers-color-scheme: dark) {
      .arrow {
        filter: invert();
      }
      #selectPageLocation::before {
        background: lch(from var(--panel-bg-color) calc(l + 15) c h);
      }
    }
  `;
}
customElements.define("popup-browseraction", BrowserActionPopup);
