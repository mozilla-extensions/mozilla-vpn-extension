import {
  html,
  css,
  LitElement,
  classMap,
  styleMap,
  createRef,
  ref,
  when,
} from "../vendor/lit-all.min.js";
import { fontStyling, ghostButtonStyles, resetSizing } from "./styles.js";

import { tr } from "../shared/i18n.js";

import { ServerCity } from "../background/vpncontroller/states.js";

/**
 * @typedef {import("../background/vpncontroller/states.js").ServerCountry} ServerCountry
 * @typedef {import("../background/vpncontroller/states.js").ServerCity} ServerCity
 * @typedef {Array<ServerCountry>} ServerCountryList
 */

/**
 * ServerList Component
 *
 * Renders a Array<ServerCountry> into a nice expandable list
 *
 * @property {ServerCountryList} serverList - The list to render this needs to be set.
 *
 * The Following Properties can be r/w but the component will modify them based on interactions.
 * @property {ServerCity} selectedCity - The current selected City
 * @property {ServerCountryList} openedCountries - Countries who's city-list is currently opened.
 *
 * @fires ServerList#selectedCityChanged - Fires if selectedCity was changed due to a Click.
 *
 *
 */
export class ServerList extends LitElement {
  static properties = {
    serverList: { type: Array },
    selectedCity: { type: ServerCity },
    openedCountries: { type: [] },
  };

  constructor() {
    super();
    /** @type {ServerCountryList} */
    this.serverList = [];
    this.selectedCity = new ServerCity();
    /** @type {Array<ServerCountry>} */
    this.openedCountries = [];
  }

  /** @param {ServerCity} city  */
  #getCityItem(city) {
    const selectCity = (city) => {
      if (city == this.selectedCity) {
        return;
      }
      this.selectedCity = city;
      this.dispatchEvent(this.#changeCityEvent(city));
    };
    return cityItem(city, this.selectedCity, selectCity);
  }

  /** @param {ServerCountry} serverCountry  */
  #getCountryListItem(serverCountry) {
    const isOpened = this.openedCountries.includes(serverCountry);
    const toggleOpen = () => {
      if (isOpened) {
        this.openedCountries = this.openedCountries.filter(
          (x) => x != serverCountry
        );
      } else {
        this.openedCountries = [serverCountry, ...this.openedCountries];
      }
    };
    return countryListItem(
      serverCountry,
      isOpened,
      toggleOpen,
      this.#getCityItem.bind(this)
    );
  }

  /** @param {ServerCity} city  */
  #changeCityEvent(city) {
    /**
     * Change City Event
     * @event ServerList#selectedCityChanged
     * @type {CustomEvent}
     * @property {ServerCity} detail.city - The new City
     * @property {ServerCountry} detail.country - The City's country
     */
    let country = this.openedCountries.find((c) => c.cities.includes(city));
    if (!country) {
      // Find country for cities selected from a search filtered list
      // where this.openedCountries is []
      country = this.serverList.find((c) => c.cities.includes(city));
    }
    return new CustomEvent("selectedCityChanged", {
      detail: { city, country },
    });
  }
  filterInput = createRef();

  render() {
    const filteredList = filterList(
      this.serverList,
      this.filterInput.value?.value
    );
    let countryListProvider = this.#getCountryListItem.bind(this);
    if (filteredList.length == 1) {
      // Nit: If we only have one, use a countryListItem provider that
      // forces the list to be open :)
      countryListProvider = (serverCountry) => {
        return countryListItem(
          serverCountry,
          true,
          () => {},
          this.#getCityItem.bind(this)
        );
      };
    }

    return html`
      <input
        type="text"
        class="search text-light"
        placeholder="${tr("searchServer")}"
        ${ref(this.filterInput)}
        @change=${() => this.requestUpdate()}
        @input=${() => this.requestUpdate()}
      />
      <label
        class="default-location-item"
        @click=${() =>
          when(this.selectedCity != null, () => {
            this.dispatchEvent(this.#changeCityEvent(null));
          })}
      >
        <input
          class="default-location-btn"
          type="radio"
          .checked=${this.selectedCity == null}
        />
        <span class="defaultCitySection">
          <span class="default-location-headline"
            >${tr("defaultLocationHeader")}</span
          >
          <span class="default-location-subline text-secondary">
            ${tr("useDefaultLocationExplainer")}
          </span>
        </span>
      </label>
      <hr />
      ${countrylistHolder(filteredList, countryListProvider)}
    `;
  }

  static styles = css`
    ${resetSizing} ${ghostButtonStyles} ${fontStyling}

    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .default-location-btn {
      margin-block: 4px auto;
    }

    .defaultCitySection {
      display: flex;
      flex-direction: column;
    }

    #moz-vpn-server-list-panel {
      width: 100%;
      overflow-x: hidden;
      overflow-y: hidden;
    }

    .server-list-item {
      display: flex;
      flex-direction: column;
      position: relative;
      background-color: var(--panel-bg-color);
    }

    .server-country-flag {
      inline-size: 16px;
      margin-inline-start: 16px;
      margin-block: auto;
      pointer-events: none;
    }

    .default-location-headline,
    .server-country-name {
      font-family: "Inter Semi Bold";
      font-size: 16px;
      line-height: 24px;
    }

    .server-country-name {
      padding-block: 0;
      padding-inline-end: 0;
      padding-inline-start: 20px;
      pointer-events: none;
      color: var(--text-color-primary);
    }

    .default-location-item,
    .server-city-list-item,
    .server-city-list-visibility-btn {
      display: flex;
      flex-direction: row;

      border-radius: 4px;
      margin-block-start: 4px;
      margin-block-end: 4px;
      margin-inline-start: 8px;
      margin-inline-end: 8px;
      inline-size: calc(100% - 16px);
      position: relative;
    }
    .server-city-list-item,
    .server-city-list-visibility-btn {
      block-size: 40px;
    }

    .default-location-item {
      padding: 8px 8px 24px;
      border-bottom: 1px solid var(--divider-color);
      border-radius: 0px;
      margin-inline: 16px;
      width: calc(var(--window-width) - 32px);
    }

    .default-location-item input {
      margin-right: 16px;
    }

    /* We need to temporarily use !important for this button to make sure the right color applies */
    .server-city-list-visibility-btn {
      display: flex;
      align-items: center;
    }

    .toggle {
      background-image: url("../../assets/img/arrow-toggle.svg");
      background-position: center center;
      background-repeat: no-repeat;
      margin-inline-start: 8px;
      pointer-events: none;
      transform: rotate(-90deg);
      transition: transform 0.275s ease-in-out;
      inline-size: 24px;
      height: 24px;
    }
    @media (prefers-color-scheme: dark) {
      .toggle {
        filter: invert(1);
      }
    }

    .opened .toggle {
      transform: rotate(0deg);
    }

    .server-city-list {
      block-size: 0;
      opacity: 0;
      transition:
        height 0.3s ease-in-out,
        opacity 0.3s ease,
        visibility 0.4s ease;
      list-style-type: none;
      visibility: hidden;
      margin-left: 48px;
    }

    .default-location-subline,
    .server-city-name {
      font-size: 14px;
      line-height: 21px;
      opacity: 0.875;
    }

    .opened .server-city-list {
      opacity: 1;
      visibility: visible;
    }

    .server-city-list-item {
      align-items: center;
      display: flex;
      position: relative;
    }

    .server-city-list-item:focus {
      outline: 2px solid var(--button-bg-focus-color-primary);
      outline-offset: 2px;
    }

    .server-city-list-item:hover {
      background-color: var(--button-bg-hover-color-secondary);
    }

    .server-city-list-item:active {
      background-color: var(--button-bg-active-color-secondary);
      outline: none;
    }

    .server-city-name {
      font-family: var(--fontMetropolisLight);
      color: var(--text-color-primary);
      padding-inline-start: 18px;
    }

    input.search {
      margin-block: 16px;
      padding: 10px 20px 10px 32px;
      color: var(--text-color-invert);
      width: calc(max(50%, 312px));
      background-image: url("../../assets/img/search-icon.svg");
      background-position: 5px 6px;
      background-repeat: no-repeat;
      border: 1px solid var(--input-border);
      border-radius: var(--button-border-radius);
      font-size: 14px;
    }
  `;
}
customElements.define("server-list", ServerList);

/**
 * @param {ServerCity} city - The City to render
 * @param {ServerCity} selectedCity - The currently selected city
 * @param {(ServerCity)=>void} selectCity - A function to select the new City.
 * @returns {*} - A lit template
 */
export const cityItem = (city, selectedCity, selectCity) => {
  /** @param {MouseEvent} e */
  const onclick = (e) => {
    e.stopPropagation();
    selectCity(city);
  };
  /** @param {KeyboardEvent} e */
  const onKeydown = (e) => {
    if (e.keyCode != 13) {
      return;
    }
    e.preventDefault();
    selectCity(city);
  };

  return html`
    <li @click=${onclick} @keydown=${onKeydown}>
      <label class="server-city-list-item" tabindex="0">
        <input
          class="server-radio-btn"
          type="radio"
          .checked=${city.name === selectedCity?.name}
          data-country-code="${city.code}"
          data-city-name="${city.name}"
        />
        <span class="server-city-name">${city.name}</span>
      </label>
    </li>
  `;
};

/**
 * @param {ServerCountry} serverCountry - The Current country
 * @param {boolean} isCityListVisibile - Should the Citylist be opened?
 * @param {(ServerCountry)=>void} toggleCityListVisibility - A callback when the list is clicked, serverCountry is the argument
 * @param {(ServerCity)=>any} cityTemplate - A Template able to Render a a given City
 */
export const countryListItem = (
  serverCountry,
  isCityListVisibile,
  toggleCityListVisibility,
  cityTemplate
) => {
  // Only render the City list if we're visible
  let cities = serverCountry.cities.map(cityTemplate);

  const onclick = (e) => {
    e.preventDefault();
    toggleCityListVisibility(serverCountry);
  };

  const listClasses = { opened: isCityListVisibile };
  const listStyles = {
    height: isCityListVisibile
      ? serverCountry.cities.length * 48 + "px"
      : "0px",
  };

  return html`
    <li
      class="server-list-item  ${classMap(listClasses)}"
      data-country-code="${serverCountry.code}"
      @click=${onclick}
    >
      <button class="server-city-list-visibility-btn ghost-btn">
        <div class="toggle"></div>
        <img
          class="server-country-flag"
          src=${"../../assets/flags/" +
          serverCountry.code.toUpperCase() +
          ".png"}
          alt="Flag of ${serverCountry.name}"
        />
        <p class="server-country-name">${serverCountry.name}</p>
      </button>
      <ul class="server-city-list " style="${styleMap(listStyles)}">
        ${cities}
      </ul>
    </li>
  `;
};

/** *
 * @param {Array<ServerCountry>} servers
 * @param {(countryListItemTemplate)=>any} countryListItemTemplate - A template returning a countrylist
 */
export const countrylistHolder = (
  serverCountryList,
  countryListItemTemplate
) => {
  const listItems = serverCountryList.map(countryListItemTemplate);

  return html`
    <div id="moz-vpn-server-list-panel">
      <ul id="moz-vpn-server-list">
        ${listItems}
      </ul>
    </div>
  `;
};

/**
 *
 * @param {Array<ServerCountry>} serverCountryList - The input List
 * @param {String} filterString - A String to filter by
 * @returns {Array<ServerCountry>} - The Filtered List
 */
export const filterList = (serverCountryList, filterString = "") => {
  const target = filterString.toLowerCase();
  return serverCountryList.filter((c) => {
    if (c.name.toLowerCase().includes(target)) {
      return true;
    }
    return c.cities.some((cty) => cty.name.toLowerCase().includes(target));
  });
};
