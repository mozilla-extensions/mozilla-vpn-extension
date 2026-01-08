/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import { html, css, LitElement, until } from "../../vendor/lit-all.min.js";

import { extPBMController, extNormalController } from "./backend.js";

import {
  fontStyling,
  resetSizing,
  positioner,
} from "../../components/styles.js";

import { tr } from "../../shared/i18n.js";
import { property } from "../../shared/property.js";

/**
 * This Element owns settings toggles.
 */
export class PopupToggles extends LitElement {
  render() {
    const toggles = this.toggles.map(PopupToggles.toggleTemplate).map(until);
    return html` <main>${toggles}</main> `;
  }

  toggles = [
    {
      prefix: html` <hr />
        <h3 class="headline">${tr("headlineAutoConnectOptions")}</h3>`,
      checked: extNormalController.autoConnect,
      canClick: Promise.resolve(true),
      onClick: () => {
        extNormalController.toggleAutoConnect();
      },
      description: html`
        <p class="control-checkbox-body">${tr("labelDescribeAutoStart")}</p>
      `,
    },
    {
      canClick: browser.extension.isAllowedIncognitoAccess(),
      checked: extPBMController.autoConnect,
      onClick: () => {
        extPBMController.toggleAutoConnect();
      },
      description: html`
        <p>${tr("labelDescribeAutoStartOnPBM")}</p>
        ${until(
          (async () => {
            if (await browser.extension.isAllowedIncognitoAccess()) {
              return;
            }
            return html` <p>${tr("bodyAutoStartOnPBM")}</p>`;
          })()
        )}
      `,
    },
  ];
  static async toggleTemplate(
    args = {
      prefix: html``,
      checked: property(true),
      canClick: Promise.resolve(true),
      onClick: () => {},
      description: html``,
      headline: "",
    }
  ) {
    const canClick = await args.canClick;
    return html`
      ${args.prefix}
      <div class="control">
        <div id="control-checkbox" class="checkbox-wrapper">
          <input
            ?disabled=${!canClick && !args.checked.value}
            .checked=${args.checked.value}
            @click=${() => {
              args.onClick();
            }}
            type="checkbox"
          />
        </div>
        <div class="control-checkbox-label">
          <label for="control-checkbox" class="headline"
            >${args.headline}</label
          >
          ${args.description}
        </div>
      </div>
    `;
  }
  static styles = css`
    ${fontStyling}${resetSizing}${positioner}
    main {
      display: flex;
      justify-content: center;
      flex-direction: column;
      padding-bottom: 15px;
    }

    * {
      color: var(--text-color-primary);
      font-family: var(--font-family);
    }
    .control {
      padding: 5px 5px 2.5px 0px;
      margin: 0px 24px;
      display: flex;
      flex-direction: row;
    }
    input {
      accent-color: var(--action-button-color);
    }
    .error {
      color: var(--action-button-color);
    }

    .headline {
      font-family: "Inter Semi Bold";
      font-size: 14px;
    }

    .control-checkbox-body {
      font-size: 13px;
      margin-block-start: 4px;
      padding-inline-end: 8px;
    }
    .control-checkbox-label,
    h3 {
      margin-inline-start: 18px;
    }
    hr {
      color: var(--grey10);
      width: 60%;
      align-self: center;
      margin: 12px 30px;
    }
  `;
}

customElements.define("popup-toggles", PopupToggles);
