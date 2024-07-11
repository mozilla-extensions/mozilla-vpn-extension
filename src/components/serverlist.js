
import { html, css, LitElement, classMap, styleMap } from "../vendor/lit-all.min.js"

import { ServerCity } from '../background/vpncontroller/states.js'

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
 * @property {ServerCountryList} openedCountries - Countries that currently are "opened"
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
      if(city == this.selectedCity){
        return;
      }
      this.selectedCity = city;
      this.dispatchEvent(this.#changeCityEvent(city));
    }
    return cityItem(city, this.selectedCity, selectCity);
  }

  /** @param {ServerCountry} serverCountry  */
  #getCountryListItem(serverCountry) {
    const isOpened = this.openedCountries.includes(serverCountry);
    const toggleOpen = () => {
      if (isOpened) {
        this.openedCountries = this.openedCountries.filter(x => x != serverCountry);
      } else {
        this.openedCountries = [serverCountry, ...this.openedCountries];
      }
    };
    return countryListItem(serverCountry, isOpened, toggleOpen, this.#getCityItem.bind(this));
  }

  /** @param {ServerCity} city  */
  #changeCityEvent(city) {
    /**
    * Change City Event
    * @event ServerList#selectedCityChanged
    * @type {CustomEvent}
    * @property {ServerCity} detail.city - The new City
    */
    return new CustomEvent('selectedCityChanged', {
      detail: { city }
    });
}

render() {
  return serverList(this.serverList, this.#getCountryListItem.bind(this));
}

  static styles = css`  
  #moz-vpn-server-list{
    padding: 0;
  }

  #moz-vpn-server-list-panel {
    block-size: var(--panelSize);
    max-block-size: var(--panelSize);
    min-block-size: var(--panelSize);
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
  
  .server-country-name {
    padding-block: 0;
    padding-inline-end: 0;
    padding-inline-start: 20px;
    font-family: var(--fontMetropolis);
    pointer-events: none;
    color: var(--text-color-primary);
  }
  
  .server-city-list-item,
  .server-city-list-visibility-btn {
    display: flex; 
    flex-direction: row;
    block-size: 40px;
    border-radius: 4px;
    margin-block-start: 4px;
    margin-block-end: 4px;
    margin-inline-start: 8px;
    margin-inline-end: 8px;
    inline-size: calc(100% - 16px);
  }
  
  /* We need to temporarily use !important for this button to make sure the right color applies */
  .server-city-list-visibility-btn {
    display: flex;
    background-color: var(--panel-bg-color) !important;
    border-radius: 4px;
    border: none;
    transition: background-color 0.3s ease;
  }
  
  .server-city-list-visibility-btn:hover {
    background-color: var(--button-bg-hover-color-secondary) !important;
  }
  
  .server-city-list-visibility-btn:focus {
    outline: 2px solid var(--button-bg-focus-color-primary);
    outline-offset: 2px;
  }
  
  .server-city-list-visibility-btn:active {
    background-color: var(--button-bg-active-color-secondary) !important;
    outline: none;
  }
  
  .toggle {
    background-image: url("../assets/img/arrow-toggle.svg");
    background-position: center center;
    background-repeat: no-repeat;
    margin-inline-start: 8px;
    pointer-events: none;
    transform: rotate(-90deg);
    transition: transform 0.275s ease-in-out;
    inline-size: 24px;
  }
  
  .expanded .toggle {
    transform: rotate(0deg);
  }
  
  .server-city-list {
    block-size: 0;
    opacity: 0;
    transition: height 0.3s ease-in-out, opacity 0.3s ease, visibility 0.4s ease;
    list-style-type: none;
    visibility: hidden;
  }
  
  .expanded .server-city-list {
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
    font-weight: 300;
    color: var(--text-color-primary);
    padding-inline-start: 18px;
  }
  `;
;


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
  }
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
              class="server-radio-btn" type="radio"
              .checked=${city.name === selectedCity.name}
              data-country-code="${city.code}" 
              data-city-name="${city.name}" 
            />
            <div class="server-radio-control"></div>
            <span class="server-city-name">${city.name}</span>
        </label>
    </li>
    `
}


/**
 * @param {ServerCountry} serverCountry - The Current country
 * @param {boolean} isCityListVisibile - Should the List be Expanded?
 * @param {(ServerCountry)=>void} toggleCityListVisibility - A callback when the list is clicked, serverCountry is the argument 
 * @param {(ServerCity)=>any} cityTemplate - A Template able to Render a a given City
 */
export const countryListItem = (
  serverCountry,
  isCityListVisibile,
  toggleCityListVisibility,
  cityTemplate) => {

  // Only render the City list if we're visible
  let cities = serverCountry.cities.map(cityTemplate)

  const onclick = (e)=>{
    e.preventDefault();
    toggleCityListVisibility(serverCountry)
  }

  const listClasses = { expanded: isCityListVisibile };
  const listStyles = {
      height : isCityListVisibile ? serverCountry.cities.length * 48 + "px" : "0px"
  }

  return html`
     <li class="server-list-item  ${classMap(listClasses)}" data-country-code="${serverCountry.code}"  @click=${onclick}>
      <button class="server-city-list-visibility-btn controller ">
        <div class="toggle"></div>
        <img class="server-country-flag" 
            src=${"../assets/flags/" + serverCountry.code.toUpperCase() + ".png"} 
            alt="Flag of ${serverCountry.name}" />
        <p class="server-country-name">${serverCountry.name}</p>
      </button>
      <ul class="server-city-list " style="${styleMap(listStyles)}">
        ${cities}
      </ul>
    </li>
    `
}

/** *
 * @param {Array<ServerCountry>} servers 
 * @param {(countryListItemTemplate)=>any} countryListItemTemplate - A template returning a countrylist
 */
export const serverList = (serverCountryList, countryListItemTemplate) => {
  const listItems = serverCountryList.map(countryListItemTemplate);

  return html`
    <div class="hide panel moz-vpn-server-list-panel" id="moz-vpn-server-list-panel">
        <ul id="moz-vpn-server-list" class="moz-vpn-server-list">
            ${listItems}
        </ul>
    </div>
    `;
}
