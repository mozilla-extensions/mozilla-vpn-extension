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

/**
 * This Element consumes an Array<SiteContext> renders it as a Table
 * it allows sorting them and manipulating them.
 */
export class ContextTable extends LitElement {
  static properties = {
    serverList: { type: Array },
    contexts: { type: Array },
    sortingKey: { type: String },
    sortingAcending: { type: Boolean },
  };
  constructor() {
    super();
    this.serverList = [];
    this.contexts = [];
    this.sortingKey = "origin";
    this.sortingAcending = true;
  }
  sorters = {
    origin: (a, b) => a.origin.localeCompare(b.origin),
    city: (a, b) => a.cityCode.localeCompare(b.cityCode),
    excluded: (a, b) => a.excluded - b.excluded,
  };

  filterInput = createRef();

  #setSorting(key, acending) {
    (this.sortingKey = key), (this.sortingAcending = acending);
  }

  render() {
    // Step 2 Select the active sorter,
    // if decending wrap it in a function swapping the inputs
    let sorter = this.sortingAcending
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
            this.sortingAcending,
            this.#setSorting.bind(this)
          )}
          ${sortedList.map((c) => tableRow(c, this.serverList))}
        </table>
        ${noElementPlaceHolder(this.contexts)}
      </div>
    `;
  }

  static styles = css`
    ${fontSizing}
    ${resetSizing}
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
    h2 {
      font-size: 38px;
      font-style: normal;
      font-weight: 700;
      line-height: 40px; /* 105.263% */
      margin-bottom: 18px;
    }
    p {
      font-size: 16px;
      font-style: normal;
      font-weight: 400;
      line-height: 169.336%;
      margin-bottom: 32px;
    }
    .tableHeader {
      height: 56px;
    }
    .tableHeader th {
      text-align: left;
      padding-left: 16px;
    }

    .emptyState {
      padding: 50px 10px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    h3 {
      font-size: 24px;
      font-style: normal;
      font-weight: 700;
      line-height: 26px;
      margin-bottom: 16px;
    }
    main p {
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 21px;
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
    .deleteBtn{
        background-color: transparent;
        color: transparent;
        border: transparent;
        background-image: url("../../assets/img/delete-gray.svg");
        background-position: center center;
      background-repeat: no-repeat;
      transition: ease-in-out 0.3s; 
    }
    .deleteBtn:hover{
        filter: brightness(1.5);
    }
    td.delete{
        width: 30px;
    }
    .row{
        display: flex;
        align-content: center;
        align-items: center;
    }


  `;
}
customElements.define("mz-context-table", ContextTable);

export const tableHeading = (
  sortedBy = "",
  acending = true,
  sortBy = () => {}
) => {
  const getClass = (id) => {
    if (sortedBy != id) {
      return "";
    }
    if (acending) {
      return "sorted-down";
    }
    return "sorted-up";
  };

  const onClick = (clickedId) => {
    // If it's the same, just toggle sort type.
    if (clickedId === sortedBy) {
      sortBy(clickedId, !acending);
      return;
    }
    // Otherwise just asc search.
    sortBy(clickedId, true);
  };

  return html`
    <tr class="tableHeader">
      <th>
        <button class=${getClass("origin")} @click=${() => onClick("origin")}>
          Website
        </button>
      </th>
      <th>
        <button
          class=${getClass("excluded")}
          @click=${() => onClick("excluded")}
        >
          VPN status
        </button>
      </th>
      <th>
        <button class=${getClass("city")} @click=${() => onClick("city")}>
          Location
        </button>
      </th>
    </tr>
  `;
};

export const noElementPlaceHolder = (contexts = new Map()) => {
  if (contexts.size != 0) {
    return null;
  }
  return html`
    <div class="emptyState">
      <img src="../../assets/img/country-tabs.svg" />
      <h3>You havent set any website preferences yet</h3>
      <p>
        If you turn off VPN protection or set a custom location for any
        websites,you'll see them here.
      </p>
    </div>
  `;
};

/**
 * @param {SiteContext} ctx
 */
export const tableRow = (ctx, serverList) => {
  const name = ctx.excluded
    ? ""
    : Utils.nameFor(ctx.countryCode, ctx.cityCode, serverList);

  return html`
    <tr class="">
      <td>${ctx.origin}</td>
      <td class="row">
        <img src="../../assets/img/shield-${ctx.excluded ? "off" : "on"}.svg" />
        ${ctx.excluded ? "OFF" : "ON"}
      </td>
      <td>${name}</td>
    </tr>
  `;
};
