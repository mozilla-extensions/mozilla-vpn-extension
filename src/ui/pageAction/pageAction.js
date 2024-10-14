/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, css, LitElement } from "../../vendor/lit-all.min.js";

import { vpnController, proxyHandler } from "../browserAction/backend.js";

import { Utils } from "../../shared/utils.js";
import { tr } from "../../shared/i18n.js";

import { fontStyling, resetSizing } from "../../components/styles.js";

/**
 * This is the Component for the Page Action Popup.
 *
 */
export class PageActionPopup extends LitElement {
  static properties = {
    servers: { type: Object },
    pageURL: { type: String },
    _siteContext: { type: Object },
  };

  constructor() {
    super();
    this.pageURL = null;
    this._siteContext = null;

    Utils.getCurrentTab().then(async (tab) => {
      if (!Utils.isValidForProxySetting(tab.url)) {
        return;
      }
      const hostname = Utils.getDomainName(tab.url);
      this.pageURL = hostname;
      if (proxyHandler.siteContexts.value.has(this.pageURL)) {
        this._siteContext = proxyHandler.siteContexts.value.get(this.pageURL);
      }
    });

    vpnController.servers.subscribe((s) => (this.servers = s));
  }

  render() {
    const excluded = this._siteContext?.excluded;
    const scheme =
      window.matchMedia &&
      !!window.matchMedia("(prefers-color-scheme:dark)").matches
        ? "light"
        : "dark";

    const contextDescriptionText = () => {
      return excluded ? "websiteProtection" : "titleServerList";
    };

    const getLocationText = () => {
      if (excluded) {
        return "Off";
      }
      const servers = this.servers;
      return servers
        .find((sc) => sc.code === this._siteContext?.countryCode)
        ?.cities.find((c) => c.code === this._siteContext?.cityCode)?.name;
    };

    const getSrc = () => {
      return excluded
        ? `./../../assets/logos/logo-${scheme}-excluded.svg`
        : `./../../assets/flags/${this._siteContext?.countryCode.toUpperCase()}.png`;
    };

    const removeContext = () => {
      proxyHandler.removeContextForOrigin(this._siteContext.origin);
    };

    const resetButtonContent = () => {
      return excluded ? "turnOnProtection" : "removeCustomLocation";
    };

    return html`
      <div class="wrapper">
        <h1>${tr("productName")}</h1>
        <p id="context-description">${tr(contextDescriptionText())}</p>

        <div class="flex line-height">
          <img id="context-img" src="${getSrc()}" />
          <p id="context-location">${getLocationText()}</p>
        </div>
      </div>
      <div class="flex">
        <button id="removeContext" @click="${removeContext}">
          ${tr(resetButtonContent())}
        </button>
      </div>
    `;
  }

  static styles = css`
    ${fontStyling}${resetSizing}

    h1 {
      font-size: 13px;
      margin-block: 0px;
      font-weight: normal;
      font-family: "Inter Regular";
      color: var(--grey40);
      line-height: 21px;
    }

    .wrapper {
      padding: 16px;
    }

    .line-height {
      block-size: 21px;
    }

    .flex {
      display: flex;
    }

    #context-description {
      margin-block: 4px 0;
    }

    #context-img {
      margin-inline-end: 8px;
      inline-size: 16px;
      margin-block: auto;
    }

    /* #context-status {
      padding: 1rem;
    } */

    p {
      margin-block: auto;
      font-size: 13px;
    }

    button {
      margin-block: 8px;
      margin-inline: 8px;
      padding: 4px 8px;
      min-block-size: 32px;
      border-radius: 4px;
      border: none;
      background: rgba(255, 255, 255, 0);
      width: 100%;
      position: relative;
      font-size: 13px;
      text-align: left;
      color: var(--button-secondary-text-color);
      transition: background 0.1s ease;
    }

    button::before {
      content: "";
      height: 1px;
      width: 100%;
      position: absolute;
      top: -8px;
      left: 0;
      right: 0;
      background-color: #c4c3c5;
    }

    button:hover {
      background: var(--button-secondary-bg-hover);
    }

    button:active {
      background: var(--button-secondary-bg-active);
    }
  `;
}
customElements.define("page-action-popup", PageActionPopup);
