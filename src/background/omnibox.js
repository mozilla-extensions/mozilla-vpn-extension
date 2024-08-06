/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Component } from "./component.js";
import { VPNController, VPNState } from "./vpncontroller/index.js";
import { ServerCity, ServerCountry } from "./vpncontroller/states.js";
import { RequestHandler } from "./requestHandler.js";
import { ProxyUtils } from "./proxyHandler/proxyUtils.js";

/**
 * Add's omnibox commands
 */
export class OmniBox extends Component {
  /**
   *
   * @param {*} receiver
   * @param {VPNController} controller
   * @param {RequestHandler} requestHandler
   */
  constructor(receiver, controller, requestHandler) {
    super(receiver);
    this.controller = controller;
    /** @type {RequestHandler} */
    this.requestHandler = requestHandler;
    this.suggestions = [];
    browser.omnibox.onInputStarted.addListener(this.onInputStarted.bind(this));
    browser.omnibox.onInputEntered.addListener(this.onInputEntered.bind(this));
    browser.omnibox.onInputChanged.addListener(this.onInputChanged.bind(this));
  }

  async init() {
    console.log("Initializing Omnibox");
    this.controller.state.subscribe((s) => {
      this.idBasedSuggestions = createIDSuggestionMap(s.servers);
      console.log(this.idBasedSuggestions);
    });
  }

  onInputStarted() {}
  onInputChanged(text, suggest) {
    console.log(text);

    // Fist: Check if it is an ID.
    if (this.idBasedSuggestions.has(text)) {
      const suggestion = this.idBasedSuggestions.get(text);
      suggest([this.idBasedSuggestions.get(text)]);
      return;
    }
    /*
        *  suggest([
                this.idBasedSuggestions.get(text),
            ]);
        */
    return;
    /**
     * Editors note: My first attempt was to
     * implement fuzzy search, so if you type
     * "vpn ber" -> it would auto suggest vpn berlin.
     *
     * This needs a bit more wörk.
     */
    const ranked = this.suggestions.map((s) => {
      return {
        suggestion: s.suggestion,
        rank: levenshteinDistance(s.key, text),
      };
    });
    const sorted = ranked.sort((a, b) => a.rank - b.rank);
    console.log(`Winner -> ${sorted[0].suggestion.content}: ${sorted[0].rank}`);
    sorted.length = 6;

    browser.omnibox.setDefaultSuggestion({
      description: sorted[0].suggestion.description,
    });

    suggest(sorted.map((a) => a.suggestion));
  }

  async onInputEntered(text, disposition) {
    if (!this.idBasedSuggestions.has(text)) {
      console.error("WHAT");
    }
    let tabID = 0;
    switch (disposition) {
      case "currentTab":
      // Yeah no.
      case "newForegroundTab":
        tabID = (await browser.tabs.create({ active: true })).id;
        break;
      case "newBackgroundTab":
        tabID = (await browser.tabs.create({ active: false })).id;
        break;
    }
    debugger;
    const usedSuggestion = this.idBasedSuggestions.get(text);
    let [countyCode, cityCode] = usedSuggestion.content.split(":");
    const proxies = ProxyUtils.getProxies(
      countyCode,
      cityCode,
      this.controller.state.value.servers
    );

    this.requestHandler.addTabProxyInfo(tabID, proxies);

    console.log(`ACCEPTED: ${text} / ${disposition} in ID: ${tabID}`);
  }
}

/**
 *The omnibox.SuggestResult type defines a suggestion that the extension can add to the address bar's drop-down list.
 * The extension's omnibox.onInputChanged event listener is passed a callback. To populate the address bar's drop-down list in response to the user's input, the extension can pass an array of omnibox.SuggestResult objects into this callbac
 * @typedef {Object} omnibox.SuggestResult
 * @property {string} content -This is the value that will appear in the address bar itself when the user highlights this suggestion in the drop-down list. This is also the string sent to the omnibox.onInputEntered event listener if the user selects this suggestion. If the string is the same as what the user has already typed, this entry will not appear in the drop-down list.
 * @property {boolean} deletable - Whether the suggest result can be deleted by the user.
 * @property {string} description - This is the string that's displayed in the address bar's drop-down list.
 */

/**
 *
 * @param {import("../components/serverlist.js").ServerCountryList} serverlist
 */
function createIDSuggestionMap(serverlist) {
  /** @type { Map<SuggestionID,omnibox.SuggestResult> } */
  const map = new Map();
  serverlist.forEach((country) => {
    map.set(country.code, countryToSuggestion(country));
    country.cities.forEach((city) => {
      map.set(createID(country, city), cityToSuggestion(country, city));
    });
  });
  return map;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Returns a "pseudo-random" number between 1 and 30
 * really not pseudo random, i know, i dont care.
 * @param {String} s - String
 * @returns {Number}
 */
const notAPseudoRandomGen = (s) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash += s.charCodeAt(i);
  }
  return hash % 30;
};

/**
 * Creates a Suggestion ID from a city and country
 *
 * @typedef {String} SuggestionID
 * @param {ServerCountry} country
 * @param {ServerCity?} city
 * @returns {SuggestionID}
 */
const createID = (country, city) => {
  if (!city) {
    return country.code;
  }
  return `${country.code}:${city.code}`;
};

/**
 * @param {ServerCountry} country
 * @param {ServerCity} city
 * @returns {omnibox.SuggestResult}
 */
const cityToSuggestion = (country, city) => {
  return {
    content: createID(country, city),
    description: `Open a new Tab in ${country.name}: ${city.name}`,
  };
};

/**
 *
 * @param {ServerCountry} country
 * @returns {omnibox.SuggestResult}
 */
const countryToSuggestion = (country) => {
  const cityIndex = notAPseudoRandomGen(country.code) % country.cities.length;
  return {
    content: createID(country, country.cities[cityIndex]),
    description: `Open a new Tab in ${country.name}`,
  };
};
