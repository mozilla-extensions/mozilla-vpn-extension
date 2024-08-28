/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  html,
  css,
  LitElement,
  createRef,
  ref,
} from "../../vendor/lit-all.min.js";
import { fontSizing, resetSizing } from "../../components/styles.js";
import { Utils } from "../../shared/utils.js";
import { tr } from "../../shared/i18n.js";
import { settingTypo } from "./styles.js";

/**
 * This Element consumes an Array<SiteContext> renders it as a Table
 * it allows sorting them and manipulating them.
 */
export class ContextTable extends LitElement {
  static properties = {
    serverList: { type: Array },
    contexts: { type: Array },
    sortingKey: { type: String },
    sortingAscending: { type: Boolean },
    onRemoveOrigin: { type: Function },
  };
  constructor() {
    super();
    this.serverList = [];
    this.contexts = [];
    this.sortingKey = "origin";
    this.sortingAscending = true;
    this.onRemoveOrigin = () => {};
  }
  sorters = {
    origin: (a, b) => a.origin.localeCompare(b.origin),
    city: (a, b) => a.cityCode.localeCompare(b.cityCode),
    excluded: (a, b) => a.excluded - b.excluded,
  };

  filterInput = createRef();

  #setSorting(key, ascending) {
    (this.sortingKey = key), (this.sortingAscending = ascending);
  }

  render() {
    // Step 2 Select the active sorter,
    // if decending wrap it in a function swapping the inputs
    let sorter = this.sortingAscending
      ? this.sorters[this.sortingKey]
      : (a, b) => this.sorters[this.sortingKey](b, a);
    // Sort it!
    const sortedList = this.contexts.sort(sorter);
    // Let's render the view!
    return html`
      <div class="tableHolder">
        <table>
          ${tableHeading(
            this.sortingKey,
            this.sortingAscending,
            this.#setSorting.bind(this)
          )}
          ${sortedList.map((c) =>
            tableRow(c, this.serverList, this.onRemoveOrigin)
          )}
        </table>
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    ${fontSizing}
    ${resetSizing}
    ${settingTypo}
      * {
      color: var(--text-color-primary);
    }

    .tableHolder {
      background: lch(from var(--panel-bg-color) calc(l + 5) c h);
      border: 1px solid var(--border-color);
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .tableHolder table {
      width: 100%;
    }

    .tableHeader {
      height: 56px;
    }
    .tableHeader th {
      text-align: left;
      padding-left: 16px;
    }

    .tableHolder th {
      background-color: var(--panel-bg-color);
    }
    .tableHolder th button {
      background-color: transparent;
      border: none;
      position: relative;
    }
    .tableHolder th button.sorted-down::after {
      content: " ";
      position: absolute;
      top: -5px;
      background-image: url("../../assets/img/arrow-toggle.svg");
      background-position: center center;
      background-repeat: no-repeat;
      margin-inline-start: 8px;
      pointer-events: none;
      transform: rotate(0deg);
      transition: transform 0.275s ease-in-out;
      inline-size: 24px;
      height: 24px;
    }
    .tableHolder th button.sorted-up::after {
      content: " ";
      position: absolute;
      top: -5px;
      background-image: url("../../assets/img/arrow-toggle.svg");
      background-position: center center;
      background-repeat: no-repeat;
      margin-inline-start: 8px;
      pointer-events: none;
      transform: rotate(180deg);
      transition: transform 0.275s ease-in-out;
      inline-size: 24px;
      height: 24px;
    }
    .tableHolder td {
      padding: 16px;
    }
    .deleteBtn {
      background-color: transparent;
      color: transparent;
      border: transparent;
      background-image: url("../../assets/img/delete-gray.svg");
      background-position: center center;
      background-repeat: no-repeat;
      transition: ease-in-out 0.3s;
    }
    .deleteBtn:hover {
      filter: brightness(1.5);
    }
    td.delete {
      width: 30px;
    }
    .row {
      display: flex;
      align-content: center;
      align-items: center;
    }
  `;
}
customElements.define("mz-context-table", ContextTable);

export const tableHeading = (
  sortedBy = "",
  ascending = true,
  sortBy = () => {}
) => {
  const getClass = (id) => {
    if (sortedBy != id) {
      return "";
    }
    if (ascending) {
      return "sorted-down";
    }
    return "sorted-up";
  };

  const onClick = (clickedId) => {
    // If it's the same, just toggle sort type.
    if (clickedId === sortedBy) {
      sortBy(clickedId, !ascending);
      return;
    }
    // Otherwise just asc search.
    sortBy(clickedId, true);
  };

  return html`
    <tr class="tableHeader">
      <th>
        <button class=${getClass("origin")} @click=${() => onClick("origin")}>
          ${tr("tableHeadingWebsite")}
        </button>
      </th>
      <th>
        <button
          class=${getClass("excluded")}
          @click=${() => onClick("excluded")}
        >
          ${tr("tableHeadingVpnStatus")}
        </button>
      </th>
      <th>
        <button class=${getClass("city")} @click=${() => onClick("city")}>
          ${tr("tableHeadingLocation")}
        </button>
      </th>
      <th></th>
    </tr>
  `;
};

/**
 * @param {SiteContext} ctx
 */
export const tableRow = (ctx, serverList, removeOrigin) => {
  const name = ctx.excluded
    ? ""
    : Utils.nameFor(ctx.countryCode, ctx.cityCode, serverList);

  return html`
    <tr class="">
      <td>
        <a href="https://${ctx.origin}">${ctx.origin}</a>
      </td>
      <td class="row">
        <img
          aria-hidden="true"
          src="../../assets/img/shield-${ctx.excluded ? "off" : "on"}.svg"
        />
        ${ctx.excluded ? tr("vpnOffStatus") : tr("vpnOnStatus")}
      </td>
      <td>${name}</td>
      <td class="delete">
        <button
          class="deleteBtn"
          title="${tr("altTextRemoveWebsiteButton", ctx.origin)}"
          @click=${() => {
            removeOrigin(ctx.origin);
          }}
        >
          ${tr("altTextRemoveWebsiteButton", ctx.origin)}
        </button>
      </td>
    </tr>
  `;
};
