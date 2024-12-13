/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement, css, classMap } from "../vendor/lit-all.min.js";

/**
 * `MZPillButton`
 *
 * Properties:
 *  - alt: Tooltip text for the button.
 *
 * Usage:
 * <mz-pill enabled=true alt="Visit Example" @clicked=${Something} />
 *
 */

export class MZPillButton extends LitElement {
  static properties = {
    enabled: { attribute: true },
    alt: { attribute: true },
  };
  constructor() {
    super();
    this.enabled = true;
    this.alt = "";
  }
  render() {
    const classes = {
      pill: true,
      on: this.enabled,
    };
    return html`
      <button class=${classMap(classes)} title=${this.alt}></button>
    `;
  }
  static styles = css`
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
    .on.pill,
    .connecting .pill {
      background-color: var(--color-enabled);
    }

    .on .pill:hover {
      background-color: var(--color-enabled-hover);
    }

    .on.pill:active {
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
    .on.pill::before {
      top: 3px;
      left: 24px;
    }
  `;
}
customElements.define("mz-pill", MZPillButton);
