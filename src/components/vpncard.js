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
import { resetSizing, fontStyling } from "./styles.js";

import { VPNState } from "../background/vpncontroller/states.js";

/**
 * @typedef {import("../background/vpncontroller/states.js").VPNState} VPNState
 */

export class VPNCard extends LitElement {
  static properties = {
    enabled: { type: Boolean },
    clientConnected: { type: Boolean },
    connectedSince: { type: Date },
    cityName: { type: String },
    countryFlag: { type: String },
    stability: { type: String },
    hasContext: { type: Boolean },
  };

  constructor() {
    super();
    this.enabled = false;
    this.clientConnected = false;
    this.cityName = "";
    this.countryFlag = "";
    this.connectedSince = 0;
    this.stability = VPNState.Stable;
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
    this.dispatchEvent(new CustomEvent("toggle", { bubbles: true }));
  }
  render() {
    const boxClasses = {
      box: true,
      on: this.enabled,
      unstable: this.enabled && this.stability === VPNState.Unstable,
      noSignal: this.enabled && this.stability === VPNState.NoSignal,
      stable:
        this.enabled &&
        this.stability != VPNState.Unstable &&
        this.stability != VPNState.NoSignal,
    };
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
    //console.log(`Connected Since ${this.connectedSince}`)
    const time = Date.now() - this.connectedSince;
    //console.log(`Elapsed Time: ${time}`)

    const timeString =
      this.enabled && this.stability === VPNState.Stable
        ? html`<p class="timer">${formatTime(time)}</p>`
        : html``;
    const vpnHeader = this.enabled ? tr("vpnIsOn") : tr("vpnIsOff");

    return html`
      <div class="${classMap(boxClasses)}">
        <main>
          ${VPNCard.shield(this.enabled)}
          <div class="infobox">
            <h1>${vpnHeader}</h1>
            ${VPNCard.subline(this.enabled, this.stability, this.clientConnected)} ${timeString}
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
          src="../../assets/flags/${countryFlag.toUpperCase()}.png"
          width="16"
          height="16"
        />
        <p>${name}</p>
      </footer>
    `;
  }

  static subline(enabled, stability, clientIsConnected) {
    if (!enabled) {
      return clientIsConnected ? html`<p class="subline ext-is-off">${tr("extensionVpnIsOff")}</p>` : null;
    }
    const errorSvg = html`
      <svg>
        <use xlink:href="../../assets/img/error.svg#error"></use>
      </svg>
    `;

    switch (stability) {
      case VPNState.NoSignal:
        return html`<p class="subline">${errorSvg} No Signal</p>`;
      case VPNState.Unstable:
        return html`<p class="subline">${errorSvg} Unstable</p>`;
      default:
        null;
    }
  }

  static shield(enabled) {
    if (!enabled) {
      return html`
        <svg>
          <use xlink:href="../../assets/img/globe-shield-off.svg#globe"></use>
        </svg>
      `;
    }
    return html`
      <svg>
        <use xlink:href="../../assets/img/globe-shield-on.svg#globe"></use>
      </svg>
    `;
  }

  static styles = css`
    ${resetSizing}${fontStyling}

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
      box-shadow: var(--box-shadow-off);
    }
    .box.on {
      background: var(--main-card-background);
      box-shadow: var(--box-shadow-on);
    }
    main,
    footer {
      display: flex;
      align-items: center;
      width: 100%;
      justify-content: baseline;
    }
    footer img {
      margin-right: 12px;
    }
    main {
      justify-content: space-between;
      padding: var(--default-padding);
      min-block-size: 114px;
    }
    footer {
      justify-content: flex-start;
      width: 100%;
      border-top: 1px solid var(--border-color);
      padding: 0px var(--default-padding);
      height: 40px;
    }
    footer p {
      color: var(--text-color-primary);
      font-size: 14px;
    }

    .box * {
      color: var(--text-color-primary);
    }
    .box.on * {
      color: var(--main-card-text-color);
    }
    .box.unstable {
      --shield-color: var(--color-warning);
      --error-fill: var(--color-warning);
    }
    .box.noSignal {
      --shield-color: var(--color-fatal-error);
      --error-fill: var(--color-fatal-error);
    }
    .box.stable {
      --shield-color: var(--color-enabled);
    }

    .infobox {
      flex: 4;
    }
    h1 {
      font-size: 16px;
      line-height: 24px;
      font-family: "Inter Semi Bold";
    }

    p {
      font-size: 14px;
      line-height: 21px;
      opacity: 0.7;
    }

    .timer,
    .subline {
      margin-block-start: calc(var(--default-padding) / 2);
    }

    .ext-is-off {
      margin-inline-end: var(--default-padding);
      margin-block-start: calc(var(--default-padding) / 4);
      font-size: 12px;
    }

    .subline svg {
      width: 14px;
      height: 14px;
      margin: 0px;
      transform: scale(1.1);
    }
    .unstable .subline {
      color: var(--color-warning);
    }
    .noSignal .subline {
      color: var(--color-fatal-error);
    }

    svg {
      height: 48px;
      width: 48px;
      transition: all 3s;
      margin-right: var(--default-padding);
    }

    .pill {
      width: 45px;
      height: 24px;
      border-radius: 30px;
      border: none;
      background-color: var(--color-disabled);
      position: relative;
      transition: background-color 0.2s ease;
    }

    .pill:hover {
      background-color: var(--color-disabled-hover);
    }

    .pill:active {
      background-color: var(--color-disabled-active);
    }
    .on .pill {
      background-color: var(--color-enabled);
    }

    .on .pill:hover {
      background-color: var(--color-enabled-hover);
    }

    .on .pill:active {
      background-color: var(--color-enabled-active);
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
  `;
}
customElements.define("vpn-card", VPNCard);

/**
 * This is a "Dummy Card" that shows a loading animation.
 */
export class VPNCardPlaceHolder extends LitElement {
  render() {
    return html`
      <main class="box">
        <div style="filter:grayscale();">
          <div class="" style="position:relative;">
            <span class="placeholder placeholderimg"></span>
            <img
              src="../../assets/img/shield-off.svg"
              style="mix-blend-mode: difference;"
            />
          </div>
        </div>
        <div class="infobox">
          <h1 class="placeholder">Loading</h1>
          <p class="placeholder">Loading</p>
        </div>
        <button class="pill placeholder"></button>
      </main>
    `;
  }

  static styles = css`
    main {
      padding: var(--padding-default);
      display: flex;
    }
    * {
      color: var(--text-color-primary);
      font-family: var(--font-family);
    }
    :host {
      font-size: 1rem;
      font-family: var(--font-family);
      --default-padding: 16px;
    }
    .placeholderimg {
      width: 100%;
      height: 100%;
      display: block;
      position: absolute;
      top: 0;
      z-index: 10;
      mix-blend-mode: initial;
      border-radius: 30px;
    }
    .box {
      border-radius: 8px;
      background: lch(from var(--panel-bg-color) calc(l + 5) c h);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-direction: row;
      box-shadow: var(--box-shadow-off);
    }
    .infobox {
      flex: 4;
      padding: 0px 10px;
    }
    img {
      margin-right: var(--default-padding);
      position: relative;
    }

    h1,
    p {
      color: transparent;
      border-radius: 5px;
    }
    h1 {
      font-size: 16px;
      line-height: 24px;
      font-family: "Inter Semi Bold";
    }
    p {
      font-size: 14px;
      line-height: 21px;
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

    .placeholder {
      background: linear-gradient(
        90deg,
        rgba(105, 105, 105, 1) 20%,
        rgba(255, 255, 255, 1) 48%,
        rgba(105, 105, 105, 1) 80%
      );
      background-size: 800% 100%;
      animation: gradient-animation 0.6s infinite;
    }

    @keyframes gradient-animation {
      0% {
        background-position: 0% 0%;
      }
      100% {
        background-position: 100% 0%;
      }
    }
  `;
}
customElements.define("vpn-card-placeholder", VPNCardPlaceHolder);
