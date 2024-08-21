/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  css,
  LitElement,
  classMap,
  styleMap,
} from "../vendor/lit-all.min.js";
import { tr } from "../shared/i18n.js";
import { resetSizing } from "./styles.js";

/**
 * @typedef {import("../background/vpncontroller/states.js").VPNState} VPNState
 */

export class VPNCard extends LitElement {
  static properties = {
    enabled: { type: Boolean },
    connectedSince: { type: Date },
    cityName: { type: String },
    countryFlag: { type: String },
  };

  constructor() {
    super();
    this.enabled = false;
    this.connectedSince = Date.now();

    this.cityName = "";
    this.countryFlag = "";
  }
  #intervalHandle = null;

  updated(changedProperties) {
    if (!changedProperties.has("enabled")) {
      return;
    }
    if (this.enabled) {
      this.#intervalHandle = setInterval(() => {
        this.requestUpdate();
      }, 1000);
      return;
    }
    clearInterval(this.#intervalHandle);
    this.#intervalHandle = null;
  }

  #toggle() {
    this.dispatchEvent(new CustomEvent("toggle"));
  }
  render() {
    const boxClasses = {
      box: true,
      on: this.enabled,
    };
    const shieldURL = this.enabled
      ? "../../assets/img/shield-on.svg"
      : "../../assets/img/shield-off.svg";

    function formatSingle(value) {
      if (value === 0) return "00";
      return (value < 10 ? "0" : "") + value;
    }
    function formatTime(milliSeconds) {
      var totalSecounds = Math.round(milliSeconds / 1000);
      var secs = totalSecounds % 60;
      totalSecounds = Math.floor(totalSecounds / 60);
      var mins = totalSecounds % 60;
      totalSecounds = Math.floor(totalSecounds / 60);
      return (
        formatSingle(totalSecounds) +
        ":" +
        formatSingle(mins) +
        ":" +
        formatSingle(secs)
      );
    }
    const timeString = this.enabled
      ? html`<p>${formatTime(Date.now() - this.connectedSince)}</p>`
      : html``;

    const subLine = this.enabled
      ? tr("isPrivateConnection")
      : tr("turnOnForPrivateConnection");
    const vpnHeader = this.enabled ? tr("vpnIsOn") : tr("vpnIsOff");

    return html`
      <div class="${classMap(boxClasses)}">
        <main>
          <img src=${shieldURL} />
          <div class="infobox">
            <h1>${vpnHeader}</h1>
            <p>${subLine}</p>
            ${timeString}
          </div>
          <button class="pill" @click=${this.#toggle}></button>
        </main>
        ${this.enabled ? VPNCard.footer(this.cityName, this.countryFlag) : null}
      </div>
    `;
  }

  static footer(name, countryFlag) {
    return html`
      <footer>
        <img
          src="../../assets/flags/${countryFlag}.png"
          width="24"
          height="24"
        />
        <p>${name}</p>
        <span> In Use </span>
      </footer>
    `;
  }

  static styles = css`
    ${resetSizing}

    :host {
      font-size: 1rem;
      font-family: var(--font-family);
      --default-padding: 16px;
    }
    .box {
      border-radius: 8px;
      background: lch(from var(--panel-bg-color) calc(l + 5) c h);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-direction: column;
    }
    .box.on {
      background: var(--main-card-background);
    }
    main,
    footer {
      display: flex;
      align-items: center;
      width: 100%;
      justify-content: baseline;
    }
    main {
      justify-content: space-between;
      padding: var(--default-padding);
    }
    footer {
      justify-content: flex-start;
      width: 100%;
      border-top: 1px solid var(--border-color);
      padding: 10px var(--default-padding);
    }
    footer p {
      color: var(--text-color-primary);
      font-size: 14px;
    }
    footer span {
      font-size: 11px;
      font-weight: bold;
    }

    .box * {
      color: var(--text-color-primary);
    }
    .box.on * {
      color: var(--main-card-text-color);
    }
    .infobox {
      flex: 4;
    }
    img {
      margin-right: var(--default-padding);
    }
    h1 {
      font-size: 18px;
      line-height: 20px;
      font-weight: 700;
    }
    p {
      font-size: 14px;
      line-height: 21px;
      font-weight: 400;
      color: var(--main-card-text-color);
      opacity: 0.7;
    }
    .pill {
      width: 45px;
      height: 24px;
      border-radius: 30px;
      border: none;
      background: #6d6d6e;
      position: relative;
    }
    .on .pill {
      background: var(--color-enabled);
    }
    .pill::before {
      content: " ";
      background: white;
      display: box;
      width: 18px;
      height: 18px;
      border-radius: 20px;
      position: absolute;
      top: 3px;
      left: 3px;
      transition: all 0.25s;
    }
    .on .pill::before {
      top: 3px;
      left: 24px;
    }

    span {
      margin: 0px 10px;
      color: var(--text-color-primary);
      padding: 6px 10px;
      background: var(--main-card--pill-background);
      opacity: 0.9;
      border-radius: 6px;
    }
  `;

  /**
   * Returns the Properties this element should have based on a VPN State
   * @param {VPNState} vpnState
   * @returns {VPNCard.properties}
   */
  static propertiesFrom(vpnState) {
    return {
      enabled: vpnState.connected,
      cityName: vpnState.exitServerCity?.name,
      countryFlag: vpnState.exitServerCountry?.code,
      connectedSince: Date.now(), // TODO: We actually dont send this from the client
    };
  }
  /**
   * Returns the Properties this element should have based on a VPN State
   * @param {VPNState} vpnState
   * @returns {void}
   */
  apply(vpnState) {
    const bag = VPNCard.propertiesFrom(vpnState);
    this.enabled = bag.enabled;
    this.cityName = bag.cityName;
    this.countryFlag = bag.countryFlag;
    this.connectedSince = bag.connectedSince;
  }
}
customElements.define("vpn-card", VPNCard);
