/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement, css } from "../vendor/lit-all.min.js";

/**
 * `IconLinkButton`
 *
 * When clicked, it opens a new browser tab with the URL specified in the `href` property.
 * The `icon` property determines the SVG icon used, and the `alt` property provides tooltip text.
 *
 * Properties:
 *  - href: URL to open in a new tab.
 *  - alt: Tooltip text for the button.
 *  - icon: Filename of the SVG icon to display. Relative to assets/img/
 *
 * Usage:
 * <mz-iconlink href="https://example.com" alt="Visit Example" icon="example-icon"></mz-iconlink>
 *
 */

export class IconLinkButton extends LitElement {
  static properties = {
    href: { attribute: true },
    alt: { attribute: true },
    icon: { attribute: true },
  };
  constructor() {
    super();
    this.href = "";
    this.alt = "";
    this.icon = "";
  }
  onClick() {
    browser.tabs.create({
      url: this.href,
    });
  }
  render() {
    return html`
      <button title="${this.alt}">
        <img
          aria-hidden="true"
          @click=${() => {
            this.onClick();
          }}
          src="../../assets/img/${this.icon}.svg"
        />
      </button>
    `;
  }

  static styles = css`
    button {
      background: transparent;
      border: transparent;
    }
  `;
}
customElements.define("mz-iconlink", IconLinkButton);