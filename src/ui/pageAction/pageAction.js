/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, css, LitElement } from "../../vendor/lit-all.min.js";

import { vpnController, proxyHandler } from "../browserAction/backend.js";

import { Utils } from "../../shared/utils.js";
import { tr } from "../../shared/i18n.js";

import { fontSizing, resetSizing } from "../../components/styles.js";

/**
 * This is the Component for the Page Action Popup.
 *
 */
export class PageActionPopup extends LitElement {
  static properties = {
    vpnState: { type: Object },
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
      const hostname = Utils.getFormattedHostname(tab.url);
      this.pageURL = hostname;
      if (proxyHandler.siteContexts.value.has(this.pageURL)) {
        this._siteContext = proxyHandler.siteContexts.value.get(this.pageURL);
      }
    });

    vpnController.state.subscribe((s) => (this.vpnState = s));
  }

  render() {
    const excluded = this._siteContext?.excluded;
    const scheme =
      window.matchMedia &&
      !!window.matchMedia("(prefers-color-scheme:dark)").matches
        ? "light"
        : "dark";

    const contextDescriptionText = () => {
      return excluded ? "Protection for this site:" : "Location for this site:";
    };

    const getLocationText = () => {
      if (excluded) {
        return "Off";
      }
      const servers = this.vpnState?.servers;
      return servers
        .find((sc) => sc.code === this._siteContext?.countryCode)
        ?.cities.find((c) => c.code === this._siteContext?.cityCode)?.name;
    };

    const getSrc = () => {
      return excluded
        ? `./../../assets/logos/logo-${scheme}-excluded.svg`
        : `./../../assets/flags/${this._siteContext?.countryCode}.png`;
    };

    const removeContext = () => {
      proxyHandler.removeContextForOrigin(this._siteContext.origin);
    };

    const resetButtonClasses = () => {
      return excluded ? "primary" : "secondary";
    };

    const resetButtonContent = () => {
      return excluded ? "Turn on" : "Remove custom location";
    };

    return html`
      <h1>${tr("productName")}</h1>
      <p id="context-description">${contextDescriptionText()}</p>

      <div class="flex">
        <img id="context-img" src="${getSrc()}" />
        <p id="context-location">${getLocationText()}</p>
      </div>
      <div class="flex">
        <button
          class="${resetButtonClasses()}"
          id="removeContext"
          @click="${removeContext}"
        >
          ${resetButtonContent()}
        </button>
      </div>
    `;
  }

  static styles = css`
    ${fontSizing}${resetSizing}

    h1 {
      font-size: 13px;
      font-weight: 600;
      margin-block: 0px 0.5rem;
      padding-block-end: 1rem;
      text-align: center;
      border-bottom: 1px solid rgb(173, 173, 173, 0.8);
    }

    .flex {
      display: flex;
    }

    #context-description {
      margin-block: 4px 0;
    }

    #context-img {
      margin-inline-end: 0.5rem;
      block-size: 1rem;
      margin-block: auto;
    }

    /* #context-status {
      padding: 1rem;
    } */

    p {
      margin-block: 0.5rem;
    }

    button {
      margin-block-start: 1rem;
      margin-inline: auto 0;
      font-weight: 500;
      padding: 4px 16px;
      min-block-size: 32px;
      border-radius: 4px;
      border: none;
      background: none;
      transition: background 0.1s ease;
    }

    .primary {
      background: var(--button-primary-bg-default);
      color: var(--button-primary-text-color);
    }

    .primary:hover {
      background: var(--button-primary-bg-hover);
    }

    .primary:active {
      background: var(--button-primary-bg-active);
    }

    .secondary {
      background: var(--button-secondary-bg-default);
      color: var(--button-secondary-text-color);
    }

    .secondary:hover {
      background: var(--button-secondary-bg-hover);
    }

    .secondary:active {
      background: var(--button-secondary-bg-active);
    }
  `;
}
customElements.define("page-action-popup", PageActionPopup);
