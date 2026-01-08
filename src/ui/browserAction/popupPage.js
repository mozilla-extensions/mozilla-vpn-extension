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
  live,
} from "../../vendor/lit-all.min.js";

import {
  vpnController,
  proxyHandler,
  extController,
  butterBarService,
} from "./backend.js";

import { Utils } from "../../shared/utils.js";
import { tr } from "../../shared/i18n.js";
import {
  fontStyling,
  ghostButtonStyles,
  resetSizing,
  inUseLabel,
  positioner,
} from "../../components/styles.js";

// Other components used
import "./../../components/stackview.js";
import "./../../components/serverlist.js";
import "./../../components/vpncard.js";
import "./../../components/titlebar.js";
import "./../../components/iconbutton.js";
import "./../../components/mz-rings.js";
import "./../../components/butter-bar.js";
import "./popup-toggles.js";
import { SiteContext } from "../../background/proxyHandler/siteContext.js";
import {
  ServerCity,
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
    servers: { type: Object },
    vpnState: { type: Object },
    extState: { type: Object },
    pageURL: { type: String },
    _siteContext: { type: Object },
    hasSiteContext: { type: Boolean },
    _siteContexts: { type: Array },
    allowDisconnect: { type: Boolean },
    alerts: { type: Array },
  };

  constructor() {
    super();
    this.pageURL = null;
    this._siteContext = null;
    /** @type {VPNState} */
    this.vpnState = null;
    browser.tabs.onUpdated.addListener(() => this.updatePage());
    browser.tabs.onActivated.addListener(() => this.updatePage());
    vpnController.state.subscribe((s) => (this.vpnState = s));
    vpnController.servers.subscribe((s) => (this.servers = s));
    proxyHandler.siteContexts.subscribe((s) => {
      this._siteContexts = s;
    });
    extController.state.subscribe((s) => {
      const currentState = this.extState;

      // Hack to mitigate FXVPN-217 and FXVPN-222
      // See Utils.delayToStateEnabledNeeded() for details
      const timer = Utils.delayToStateEnabledNeeded(
        currentState?.state,
        s.state
      )
        ? Utils.connectingDelay
        : 0;
      setTimeout(() => {
        this.extState = s;
        this.updatePage();
      }, timer);
    });
    butterBarService.butterBarList.subscribe((s) => {
      this.alerts = s;
      this.updatePage();
    });
    this.updatePage();
    extController.allowDisconnect.subscribe((s) => {
      this.allowDisconnect = s;
    });
  }
  updatePage() {
    Utils.getCurrentTab().then(async (tab) => {
      if (!Utils.isValidForProxySetting(tab.url)) {
        this.pageURL = null;
        this._siteContext = null;
        this.hasSiteContext = false;
        return;
      }
      const hostname = Utils.getDomainName(tab.url);
      this.pageURL = hostname;
      if (this._siteContexts.has(this.pageURL)) {
        this._siteContext = proxyHandler.siteContexts.value.get(this.pageURL);
      }
    });
    this.resizePopup();
  }

  // Hackfix for FXVPN-178
  // Extension's height does not respond when elements leave the DOM
  resizePopup() {
    const conditionalView = document.getElementById("conditional-view");
    if (!conditionalView) {
      return;
    }
    document.body.style.height = conditionalView.offsetHeight + "px";
    document.body.style.height = "auto";
  }

  connectedCallback() {
    super.connectedCallback();
    requestIdleCallback(() => {
      vpnController.postToApp("status");
    });
    requestIdleCallback(() => {
      vpnController.postToApp("servers");
    });
    requestIdleCallback(() => {
      vpnController.postToApp("featurelist");
    });
    requestIdleCallback(() => {
      vpnController.postToApp("interventions");
    });
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
      proxyHandler.removeContextForOrigin(this.pageURL);
    }
    this._siteContext = value;
  }

  /**
   * Ref's are Elements we want to keep track of
   */
  stackView = createRef();

  render() {
    const handleVPNToggle = () => {
      extController.toggleConnectivity();
    };

    const back = () => {
      this.stackView?.value?.pop().then(() => {
        this.requestUpdate();
        this.updatePage();
      });
    };

    const canGoBack = (() => {
      if (!this.stackView.value) {
        return false;
      }
      return this.stackView?.value?.count > 1;
    })();

    let title = this.stackView?.value?.currentElement?.dataset?.title;
    title ??= tr("productName");

    return html`
      <vpn-titlebar title="${title}" ${ref(this.titleBar)}>
        ${canGoBack ? BrowserActionPopup.backBtn(back) : null}
        ${!canGoBack
          ? BrowserActionPopup.settingsIcon(this.openSettingsPanel)
          : null}
      </vpn-titlebar>
      <stack-view ${ref(this.stackView)}>
        <section data-title="Mozilla VPN" class="limit-panel-height">
          <main>
            <div class="butter-bar-holder">
              ${this.alerts.map(
                (alert) => html`
                  <butter-bar
                    .alertId=${alert.alertId}
                    .alertMessage=${alert.alertMessage}
                    .linkText=${alert.linkText}
                    .linkUrl=${alert.linkUrl}
                  >
                  </butter-bar>
                `
              )}
            </div>
            <vpn-card
              @toggle=${handleVPNToggle}
              .enabled=${this.extState?.enabled}
              .clientConnected=${this.vpnState?.state === "Enabled"}
              .entryCityName=${this.vpnState?.entryServerCity?.name}
              .entryCountryFlag=${this.vpnState?.entryServerCountry?.code}
              .exitCityName=${this.vpnState?.exitServerCity?.name}
              .exitCountryFlag=${this.vpnState?.exitServerCountry?.code}
              .connectedSince=${this.extState?.connectedSince}
              .stability=${this.vpnState?.connectionHealth}
              .hasContext=${this._siteContext}
              .connecting=${this.extState?.connecting}
              .allowDisconnect=${this.allowDisconnect}
            ></vpn-card>
            ${this.locationSettings()}
          </main>
        </section>
      </stack-view>
    `;
  }

  locationSettings() {
    if (!this.pageURL || !this.extState?.enabled) {
      return null;
    }
    const resetSitePreferences = async () => {
      this.currentSiteContext = null;
    };
    const toggleExcludeWebsite = async () => {
      if (this.currentSiteContext.excluded) {
        resetSitePreferences();
        return;
      }
      const new_cntxt = {
        ...this.currentSiteContext,
        excluded: true,
        origin: this.pageURL,
      };
      this.currentSiteContext = new_cntxt;
    };

    const getExclusionStringElem = (origin) => {
      const originPlaceholder = "dummyString";
      const localizedString = tr("excludePageFor", originPlaceholder);
      // Create a new <p> element
      const el = document.createElement("p");

      // Replace "dummyString" with <span>origin</span>
      const parts = localizedString.split(originPlaceholder);
      return html`
        <p class="text-secondary">
          ${parts.at(0)}
          <span class="origin bold">${origin}</span>
          ${parts.at(-1)}
        </p>
      `;
    };

    const openGiveFeedback = () => {
      browser.tabs.create({
        url: "https://qsurvey.mozilla.com/s3/VPN-Extension-Feedback",
      });
      window.close();
    };

    return BrowserActionPopup.sitePreferencesTemplate(
      this.currentSiteContext,
      this.openServerList.bind(this),
      toggleExcludeWebsite,
      (ctx = new SiteContext()) => {
        return Utils.nameFor(ctx.countryCode, ctx.cityCode, this.servers);
      },
      resetSitePreferences,
      this._siteContext !== null,
      getExclusionStringElem,
      openGiveFeedback
    );
  }

  async openSettingsPanel() {
    const settingsPanelElement = BrowserActionPopup.createSettingsPanel();
    await this.stackView.value?.push(settingsPanelElement);
    this.requestUpdate();
  }

  async openServerList() {
    let serverListResult = Promise.withResolvers();

    const ctx = this._siteContext;
    const serverListSelectedCity = Utils.getCity(
      ctx?.countryCode,
      ctx?.cityCode,
      this.servers
    );

    const serverListElement = BrowserActionPopup.createServerList(
      serverListSelectedCity,
      this.servers,
      (e) => serverListResult.resolve(e.detail)
    );
    // Push onto the Stackview and request an update as the
    // we read the stackview's top for the titlebar
    await this.stackView.value?.push(serverListElement);
    this.requestUpdate();

    const { city, country } = await serverListResult.promise;
    // We're done with the server list, pop it off the stackview
    this.stackView.value?.pop().then(() => {
      this.requestUpdate();
    });
    if (!city) {
      // Remove the site context
      this.currentSiteContext = null;
      return;
    }
    const newSiteContext = new SiteContext({
      cityCode: city.code,
      countryCode: country.code,
      origin: this.pageURL,
      excluded: false,
    });
    this.currentSiteContext = newSiteContext;
  }

  static sitePreferencesTemplate(
    siteContext = new SiteContext(),
    openServerList = () => {},
    toggleExcluded = () => {},
    getNameForContext = (ctx = new SiteContext()) => {
      return "";
    },
    removeSiteContext = () => {},
    hasSiteContext = false,
    getExclusionStringElem = () => {},
    openGiveFeedback = () => {}
  ) {
    const pageLocationPicker = (() => {
      return html`
        <h2 class="select-location-title">${tr("selectWebsiteLocation")}</h2>
        <button
          class="row ghost-btn "
          id="selectPageLocation"
          .disabled=${live(siteContext.excluded)}
          @click=${openServerList}
        >
          <div class="positioner">
            <img
              src="../../assets/flags/${siteContext.countryCode.toUpperCase()}.png"
              height="16"
              width="16"
              class="flag"
            />
          </div>
          <p class="text-secondary">${getNameForContext(siteContext)}</p>
          ${hasSiteContext && !siteContext.excluded
            ? html`<span class="in-use in-use-light"> In Use </span>`
            : null}
          <img aria-disabled="true" height="12" width="12" class="arrow" />
        </button>
      `;
    })();

    return html`
      <h1>${tr("titlePageSettings")}</h1>
      <div class="row">
        <div class="positioner checkbox-positioner">
          <input
            type="checkbox"
            .checked=${live(siteContext.excluded)}
            @click=${toggleExcluded}
          />
        </div>
        ${getExclusionStringElem(siteContext.origin)}
      </div>
      ${pageLocationPicker}
      <button
        id="resetPageSettings"
        class=${hasSiteContext ? "" : "disabled"}
        @click=${removeSiteContext}
      >
        ${tr("resetPageSettings")}
      </button>
      <button id="give-feedback" @click=${openGiveFeedback} class="ghost-btn">
        ${tr("giveFeedback")}
      </button>
    `;
  }
  static backBtn(back) {
    return html` <mz-iconlink
      @click=${back}
      alt="${tr("back")}"
      icon="arrow-icon-left"
      slot="left"
    ></mz-iconlink>`;
  }

  static settingsIcon(openSettings) {
    return html`
      <mz-iconlink
        @click=${openSettings}
        alt=${tr("altTextOpenSettingsPage")}
        icon="settings-cog"
        slot="right"
      ></mz-iconlink>
    `;
  }

  static createSettingsPanel() {
    const viewElement = document.createElement("section");
    viewElement.classList = ["settings-panel"];
    viewElement.dataset.title = "Settings";

    const openInNewTab = (url) => {
      browser.tabs.create({ url });
      window.close();
    };

    const settingsLinks = [
      {
        title: tr("websitePreferences"),
        onClick: () => {
          openInNewTab("/ui/settingsPage/index.html");
        },
        iconId: "websitePreferences",
      },
      {
        title: tr("helpCenter"),
        onClick: () => {
          openInNewTab(
            "https://support.mozilla.org/products/firefox-private-network-vpn/settings/add-ons-extensions-and-themes"
          );
        },
        iconId: "helpCenter",
      },
      {
        title: tr("contactSupport"),
        onClick: () => {
          openInNewTab(
            "https://support.mozilla.org/questions/new/firefox-private-network-vpn/form"
          );
        },
        iconId: "contactSupport",
      },
    ];

    render(
      html`
        <ul id="settingsList">
          ${settingsLinks.map(
            (link) => html`
              <li>
                <button class="${link.iconId}" @click=${link.onClick}>
                  ${link.title}
                </button>
              </li>
            `
          )}
        </ul>
        <popup-toggles></popup-toggles>
      `,
      viewElement
    );
    return viewElement;
  }
  /**
   * @param {ServerCity?} currentCity
   * @param { import("./../../components/serverlist.js").ServerCountryList } list - The ServerList to Render
   * @param {($0: Event)=>{} } onResult - A callback fired when a city or "back" is clicked.
   *                                    - Contains an HTML Event with Optinal
   *                                    - { detail.city : ServerCity }
   * @returns {HTMLElement} - An already rendered Element, ready to put into the DOM
   */
  static createServerList(currentCity = null, list = [], onResult = () => {}) {
    const viewElement = document.createElement("section");
    viewElement.classList = ["limit-panel-height"];
    viewElement.dataset.title = tr("titleServerList");
    render(
      html`
        <server-list
          .selectedCity=${currentCity}
          .serverList=${list}
          @selectedCityChanged=${onResult}
        >
        </server-list>
      `,
      viewElement
    );
    return viewElement;
  }

  static styles = css`
    ${fontStyling}${resetSizing}${ghostButtonStyles}${inUseLabel}${positioner}

    section {
      background-color: var(--panel-bg-color);
    }

    section.limit-panel-height {
      overflow-y: auto;
      max-height: var(--window-max-height);
    }

    main {
      padding: var(--padding-default) var(--padding-default) 0
        var(--padding-default);
      max-inline-size: var(--window-width);
    }

    .positioner.checkbox-positioner {
      margin-block: 0px auto;
    }

    * {
      color: var(--text-color-primary);
      font-family: var(--font-family);
    }

    .row {
      display: flex;
      align-items: center;
    }

    .in-use {
      margin: auto auto auto 8px;
    }

    .arrow {
      margin: auto 0px auto auto;
      mask-size: 8px;
      mask-image: url("../../assets/img/arrow-icon-right.svg");
      background: var(--firefox-popup_text);
      mask-position: center;
      mask-repeat: no-repeat;
    }

    .flag {
      margin: auto;
    }

    #selectPageLocation {
      padding: 0;
      position: relative;
      margin-block: 0px;
      color: var(--text-secondary-color);
      display: flex;
      height: 40;
      justify-content: flex-start;
    }

    #selectPageLocation:hover {
      cursor: default;
    }

    #selectPageLocation::before {
      inset: 0px -8px;
    }

    #selectPageLocation p {
      text-align: left;
    }

    vpn-card {
      display: block;
      margin-bottom: 16px;
    }

    h1 {
      margin-block: 0 simportant!;
      padding-block: 8px 16px !important;
    }

    .origin.bold {
      word-break: break-word;
      max-width: 260px;
    }
    h3 {
      margin-block: calc(var(--padding-default) / 2) 0px;
    }

    h2 {
      margin-block-start: var(--padding-default);
      margin-block-end: 0px !important;
    }

    input {
      width: 20px;
      height: 20px;
      border: 1px solid var(--border-color);
      background-color: var(--panel-bg-color);
      accent-color: var(--mz-accent-color);
    }

    input + p {
      margin-left: var(--padding-default);
    }

    button {
      width: 100%;
      border-radius: 4px;
      padding: 8px, 16px, 8px, 16px;
      font-size: 16px;
      border: none;
      color: var(--action-button-color);
      background-color: transparent;
      padding: 10px;
      margin-block: var(--padding-default);
      font-weight: normal;
      font-family: "Inter Semi Bold";
    }

    #selectPageLocation:disabled,
    #resetPageSettings.disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    #resetPageSettings {
      margin-block-end: 0px;
      box-shadow: 0 0 0 2px var(--action-button-color);
    }

    #give-feedback {
      margin-block: 8px 16px;
      border: none;
      font-size: 15px;
    }

    #settingsList {
      width: 100%;
    }

    #settingsList li {
      margin: 8px;
    }

    #settingsList button {
      inline-size: 100%;
      text-align: left;
      block-size: 40px;
      background: lch(from var(--action-button-color) l c h / 0);
      padding-left: 48px;
      position: relative;
      color: var(--text-color-primary);
      outline: none;
      border: 2px solid transparent;
      margin: 0;
      font-size: 15px;
      transition: background 0.2s ease-in-out;
    }

    #settingsList button::before,
    #settingsList button::after {
      content: "";
      block-size: 24px;
      inline-size: 24px;
      display: inline-block;
      background-position: center center;
      background-repeat: no-repeat;
      background-size: contain;
      position: absolute;
      top: 0;
      bottom: 0;
      margin-block: auto;
    }

    #settingsList button::before {
      background: var(--firefox-popup_text);
      left: 8px;
    }

    #settingsList button::after {
      position: absolute;
      right: 16px;
      mask-image: url("../../assets/img/open-in-web.svg");
      background-color: var(--action-button-color);
    }

    .contactSupport::before {
      mask-image: url("../../assets/img/mail.svg");
    }

    .websitePreferences::before {
      mask-image: url("../../assets/img/developer.svg");
    }

    .helpCenter::before {
      mask-image: url("../../assets/img/question.svg");
    }

    @media (prefers-color-scheme: dark) {
      #settingsList button {
        color: var(--text-color-headline);
      }
      button {
        color: rgba(255, 255, 255, 1);
      }

      #resetPageSettings {
        box-shadow: none;
        border: none;
        background: var(--action-button-color);
        color: black;
      }

      #resetPageSettings:hover {
        background: lch(from var(--action-button-color) calc(l - 20) c h);
      }

      #resetPageSettings:active {
        background: lch(from var(--action-button-color) calc(l - 20) c h);
      }

      #give-feedback {
        color: var(--action-button-color);
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
