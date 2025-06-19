/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import { html, css, LitElement } from "../../vendor/lit-all.min.js";
/**
 * This Element shows a Placeholder Animation until the
 * Backend Script is finalized, after finalization, it will remove itself from the DOM.
 */
export class PopupPlaceHolder extends LitElement {
  static properties = {
    // Show placeholder until this promise is resolved.
    untilPromise: { type: Object },
  };
  constructor() {
    super();
    // This module uses top-level await, so if this module is loaded,
    // we know ipc is working
    this.untilPromise = import("./backend.js");
  }
  connectedCallback() {
    super.connectedCallback();
    this.untilPromise.then(() => {
      // Goodbye!
      this.parentElement.removeChild(this);
    });
  }

  render() {
    return html`
      <vpn-titlebar title="Loading"> </vpn-titlebar>
      <div class="outer">
        <main class="box">
          <div style="filter:grayscale();">
            <div class="" style="position:relative;">
              <span class="placeholder placeholderimg"></span>
            </div>
          </div>
          <div class="infobox">
            <h1 class="placeholder">Loading</h1>
            <p class="placeholder">Loading</p>
          </div>
          <button class="pill placeholder"></button>
        </main>
      </div>
    `;
  }

  static styles = css`
    :host {
    }
    main {
      padding: var(--padding-default);
      display: flex;
    }
    * {
      color: var(--text-color-primary);
      font-family: var(--font-family);
    }
    .outer {
      padding: 15px;
    }
    :host {
      font-size: 1rem;
      font-family: var(--font-family);
      --default-padding: 16px;
    }
    .placeholderimg {
      width: 50px;
      height: 50px;
      display: block;
      top: 0px;
      z-index: 10;
      mix-blend-mode: initial;
      border-radius: 30px;
    }
    .box {
      border-radius: 8px;
      background: var(--grey5);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-direction: row;
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
      font-size: 18px;
      line-height: 20px;
      font-weight: 700;
    }
    p {
      line-height: 14px;
      font-weight: 400;
      opacity: 0.7;
      line-height: 14px;
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
customElements.define("popup-placeholder", PopupPlaceHolder);
