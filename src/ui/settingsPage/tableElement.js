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
import { fontStyling, resetSizing } from "../../components/styles.js";
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
    ${fontStyling}
    ${resetSizing}
    ${settingTypo}

    .tableHolder {
      background: lch(from var(--panel-bg-color) calc(l + 5) c h);
      border: 1px solid var(--settings-border-color);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }

    .tableHolder table {
      width: 100%;
    }

    .tableHeader th {
      padding-inline: 32px;
      // border-bottom: 1px solid var(--settings-border-color);
    }

    tr {
      border-bottom: 1px solid var(--settings-border-color);
    }

    tr:last-of-type {
      border-bottom: none;
    }

    td, tr, .tableHeader {
      height: 56px;
      vertical-align: center;
    }

    a,
    a:visited {
      text-decoration: none;
      color: var(--settings-link-color);
      transition: color 0.2s ease-in-out;
    }

    a:hover {
      color: lch(from var(--settings-link-color) l c h / 0.8)
    }

    a:active {
      color: lch(from var(--settings-link-color) l c h / 0.5)
    }

    .tableHolder th {
      background-color: var(--panel-bg-color);
    }

    th:first-of-type {
      text-align: left;
    }

    .tableHolder th button {
      background-color: transparent;
      border: none;
      position: relative;
      font-family: "Inter Semi Bold";
      font-size: 16px;
      width: 100%;
      color: var(--text-color-headline);
    }

    .tableHolder th button.sorted-down::after {
      content: " ";
      position: absolute;
      top: -2px;
      background-image: url("../../assets/img/arrow-toggle.svg");
      background-position: center center;
      background-repeat: no-repeat;
      margin-inline-start: 0px;
      pointer-events: none;
      transform: rotate(0deg);
      transition: transform 0.275s ease-in-out;
      inline-size: 24px;
      height: 24px;
    }

    .tableHolder th button.sorted-up::after {
      content: " ";
      position: absolute;
      top: -2px;
      background-image: url("../../assets/img/arrow-toggle.svg");
      background-position: center center;
      background-repeat: no-repeat;
      margin-inline-start: 0px;
      pointer-events: none;
      transform: rotate(180deg);
      transition: transform 0.275s ease-in-out;
      inline-size: 24px;
      height: 24px;
    }

    .tableHolder td {
      padding: 16px 32px;
    }

    span {
      font-size: 16px;
      color: var(--text-color-headline);
    }

    td.row {
      text-align: center;

    }

    .align-left button {
      text-align: left;
    }

    .flx-wrapper {
      display: flex;
      justify-content: center;
      align-items: flex-end;
    }

    .flag-icon {
      inline-size: 16px;
      margin-block-end: 3px;
      margin-inline-end: 8px;
    }

    .on-off-icon {
      margin-block-end: -1px;
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
      <th class="align-left">
        <button class=${getClass("origin")} @click=${() => onClick("origin")}>
          ${tr("tableHeadingWebsite")}
        </button>
      </th>
      <th style="text-align:center">
        <button
          class=${getClass("excluded")}
          @click=${() => onClick("excluded")}
        >
          ${tr("tableHeadingVpnStatus")}
        </button>
      </th>
      <th style="text-align:center">
        <button class=${getClass("city")} @click=${() => onClick("city")}>
          ${tr("titleServerList")}
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
    
  let flagIcon =  null;
  if (!ctx.excluded) {
    flagIcon = html`<img
    class="flag-icon"
    src="../../assets/flags/${ctx.countryCode.toUpperCase()}.png">`;
  }
  return html`

    <tr class="">
      <td>
        <a href="https://${ctx.origin}">${ctx.origin}</a>
      </td>
      <td class="row">
        <div class="flx-wrapper">
          <img
            class="on-off-icon"
            aria-hidden="true"
            src="../../assets/img/shield-${ctx.excluded ? "off" : "on"}.svg"
          />
          <span>${ctx.excluded ? tr("vpnOffStatus") : tr("vpnOnStatus")}</span>
        </div>
      </td>
      <td class="row">
        <div class="flx-wrapper">
        ${flagIcon}
        <span class="city-name">${name}</span>
      </td>
    </tr>
  `;
};
