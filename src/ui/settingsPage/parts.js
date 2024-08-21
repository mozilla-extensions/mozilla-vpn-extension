import { SiteContext } from "../../background/proxyHandler/siteContext.js";
import { html, css } from "../../vendor/lit-all.min.js";

import { Utils } from "../../shared/utils.js";

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
      <td>
        <img src="../../assets/img/shield-${ctx.excluded ? "off" : "on"}.svg" />
      </td>
      <td>${name}</td>
    </tr>
  `;
};

/**
 * Takes a map of sitecontexts
 * @param {Map<String,SiteContext>} siteContextList
 */
export const filter = (siteContextList, filterString = "") => {
  const out = [];
  siteContextList.keys().forEach((key) => {
    if (key.includes(filterString)) {
      out.push({ ...siteContextList.get(key) });
    }
  });
  return out;
};
