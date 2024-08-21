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

import { vpnController, proxyHandler } from "./backend.js";

import { Utils } from "../../shared/utils.js";

import { fontSizing, resetSizing } from "../../components/styles.js";

// Other components used
import "./../../components/stackview.js";
import "./../../components/serverlist.js";
import "./../../components/vpncard.js";
import "./../../components/titlebar.js";
import { settingsButton } from "./../../components/settingsBtn.js";
import { SiteContext } from "../../background/proxyHandler/siteContext.js";
import {
  ServerCountry,
  VPNState,
} from "../../background/vpncontroller/states.js";

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
    _siteContext: { type: Object },
    hasSiteContext: { type: Boolean },
  };

  constructor() {
    super();
    this.pageURL = null;
    this._siteContext = null;
    Utils.getCurrentTab().then(async (tab) => {
      if (!Utils.isValidForProxySetting(tab.url)) {
        return;
      }
      const hostname = Utils.getFormattedHostname(tab.url);
      this.pageURL = hostname;
      if (proxyHandler.siteContexts.value.has(this.pageURL)) {
        this._siteContext = proxyHandler.siteContexts.value.get(this.pageURL);
      }
    });
    vpnController.state.subscribe((s) => (this.vpnState = s));
  }
  connectedCallback() {
    super.connectedCallback();
  }

  get currentSiteContext() {
    if (this._siteContext) {
      return this._siteContext;
    }
    return defaultSiteContext(this.vpnState, this.pageURL);
  }
  set currentSiteContext(value) {
    if (value) {
      proxyHandler.addSiteContext(value);
    } else {
      proxyHandler.removeContextForOrigin(this._siteContext.origin);
    }
    this._siteContext = value;
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
        ${settingsButton()}
      </vpn-titlebar>
      <stack-view ${ref(this.stackView)}>
        <section data-title="Mozilla VPN">
          <main>
            <vpn-card
              .enabled=${this.vpnState?.connected}
              .cityName=${this.vpnState?.exitServerCity?.name}
              .countryFlag=${this.vpnState?.exitServerCountry?.code}
            ></vpn-card>
            ${this.locationSettings()}
          </main>
        </section>
      </stack-view>
    `;
  }

  locationSettings() {
    if (!this.pageURL) {
      return null;
    }
    const resetSitePrefrences = async () => {
      this.currentSiteContext = null;
    };
    const toggleExcludeWebsite = async () => {
      if (this.currentSiteContext.excluded) {
        resetSitePrefrences();
        return;
      }
      const new_cntxt = {
        ...this.currentSiteContext,
        excluded: true,
        origin: this.pageURL,
      };
      this.currentSiteContext = new_cntxt;
    };

    return BrowserActionPopup.sitePrefrencesTemplate(
      this.currentSiteContext,
      this.openServerList.bind(this),
      toggleExcludeWebsite,
      (ctx = new SiteContext()) => {
        return Utils.nameFor(
          ctx.countryCode,
          ctx.cityCode,
          this.vpnState.servers
        );
      },
      resetSitePrefrences,
      this._siteContext !== null
    );
  }

  openServerList() {
    const onSelectServerResult = (event) => {
      this.stackView.value?.pop().then(() => {
        this.requestUpdate();
      });
      const city = event?.detail?.city;
      const country = event?.detail?.country;
      if (city) {
        const newSiteContext = new SiteContext({
          cityCode: city.code,
          countryCode: country.code,
          origin: this.pageURL,
          excluded: false,
        });
        this.currentSiteContext = newSiteContext;
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

  static sitePrefrencesTemplate(
    siteContext = new SiteContext(),
    openServerList = () => {},
    tooggleExcluded = () => {},
    getNameForContext = (ctx = new SiteContext()) => {
      return "";
    },
    removeSiteContext = () => {},
    hasSiteContext = false
  ) {
    const pageLocationPicker = (() => {
      if (siteContext.excluded) {
        return null;
      }
      return html`
        <h2>Select site location</h2>
        <div class="row" id="selectPageLocation" @click=${openServerList}>
          <img
            src="../../assets//flags/${siteContext.countryCode}.png"
            height="24"
            width="24"
          />
          <p>${getNameForContext(siteContext)}</p>
          <img
            src="../../assets/img/arrow-icon-right.svg"
            height="12"
            width="12"
            class="arrow"
          />
        </div>
      `;
    })();

    return html`
      <h1>Preferences for this site</h1>
      <div class="row">
        <input
          type="checkbox"
          ?checked=${siteContext.excluded}
          @click=${tooggleExcluded}
        />
        <p>Always turn off VPN protection for <b>${siteContext.origin}</b></p>
      </div>
      ${pageLocationPicker}
      ${hasSiteContext
        ? html`<button id="selectLocation" @click=${removeSiteContext}>
            Reset Site Preferences
          </button>`
        : null}
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

const defaultSiteContext = (vpnState = new VPNState(), origin = "") => {
  return new SiteContext({
    origin,
    countryCode: vpnState?.exitServerCountry?.code,
    cityCode: vpnState?.exitServerCity?.code,
    excluded: false,
  });
};
