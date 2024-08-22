/**
 * @jest-environment jsdom
 */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test } from "@jest/globals";
import { render, html } from "../../../src/vendor/lit-all.min.js";

import {
  Server,
  ServerCity,
  ServerCountry,
} from "../../../src/background/vpncontroller/states.js";

import {
  cityItem,
  countryListItem,
  countrylistHolder,
  ServerList,
} from "../../../src/components/serverlist.js";

//#region TestData
const testCity = (() => {
  let x = new ServerCity();
  x.code = "de-de";
  x.name = "Berlino";
  x.lat = 0.01;
  x.long = 0.02;
  x.servers = [new Server()];
  return x;
})();
const otherTestCity = (() => {
  let x = new ServerCity();
  x.code = "uk-uk";
  x.name = "Landon";
  x.lat = 0.01;
  x.long = 0.02;
  x.servers = [new Server()];
  return x;
})();

const testCountry = (() => {
  let out = new ServerCountry();
  out.cities = [testCity, otherTestCity];
  out.code = "oh-no";
  out.name = "Testville";
  return out;
})();
const testServerList = [testCountry];
//#endregion

describe("Serverlist Templates", () => {
  test("use jsdom in this test file", () => {
    const element = document.createElement("div");
    expect(element).not.toBeNull();
  });
  test("can we use lit?", () => {
    const template = html`Hello World`;
    const element = document.createElement("div");
    render(template, element);
    expect(element.textContent).toBe("Hello World");
  });

  test("serverList renders", () => {
    const subListTemplate = (city) => html``;
    const element = document.createElement("div");
    expect(element.innerHTML).toBe("");
    render(countrylistHolder([], subListTemplate), element);
    expect(element.innerHTML).not.toBe("");
  });
  test("serverList renders calls the subListTemplate with a city and renders the result", () => {
    const subListTemplate = (city) => html`
      <li>
        <h1 id="${city.name}">I am a List of ${city.name}</h1>
      </li>
    `;
    const element = document.createElement("div");
    render(
      countrylistHolder(
        [{ name: "city1" }, { name: "city2" }],
        subListTemplate
      ),
      element
    );

    expect(element.querySelector("#city1")).not.toBeNull();
    expect(element.querySelector("#city2")).not.toBeNull();
  });

  test("cityItem renders", () => {
    const element = document.createElement("div");
    expect(element.innerHTML).toBe("");
    render(
      cityItem(testCity, otherTestCity, () => {}),
      element
    );
    // City name should be there
    expect(element.querySelector(".server-city-name").textContent).toBe(
      testCity.name
    );
    // Should not be checked
    expect(element.querySelector(".server-radio-btn").checked).toBe(false);
    // Should fill in the country code
    expect(element.querySelector(".server-radio-btn").dataset.countryCode).toBe(
      testCity.code
    );
    expect(element.querySelector(".server-radio-btn").dataset.cityName).toBe(
      testCity.name
    );
  });

  test("cityItem checks the Input if it is the Selected City", () => {
    const element = document.createElement("div");
    expect(element.innerHTML).toBe("");
    render(
      cityItem(testCity, testCity, () => {}),
      element
    );
    // City name should be there
    expect(element.querySelector(".server-city-name").textContent).toBe(
      testCity.name
    );
  });

  test("countryListItem renders", () => {
    const element = document.createElement("div");
    expect(element.innerHTML).toBe("");
    render(
      countryListItem(
        testCountry,
        false,
        (country) => {},
        (city) => {
          return html`<p class="city">${city.name}</p>`;
        }
      ),
      element
    );
    // It should render the subtemplate
    expect(element.querySelector(".city").textContent).toBe(
      testCountry.cities[0].name
    );
    // There should be a flag loaded
    expect(element.querySelector("img").src).toContain(
      "assets/flags/" + testCountry.code.toUpperCase() + ".png"
    );
    // There should be no "expanded things"
    expect(element.querySelectorAll(".opened").length).toBe(0);

    // Now render it again with isOpen = true
    render(
      countryListItem(
        testCountry,
        true,
        (country) => {},
        (city) => {
          return html`<p class="city">${city.name}</p>`;
        }
      ),
      element
    );
    // There should be no "expanded things"
    expect(element.querySelectorAll(".opened").length).not.toBe(0);
  });

  test("countryListItem fires callback on click", async () => {
    const element = document.createElement("div");

    const onCountrySelectedFired = new Promise((res) => {
      render(
        countryListItem(testCountry, false, res, (city) => {
          return html`<p class="city">${city.name}</p>`;
        }),
        element
      );
      element.querySelector(".toggle").click();
    });
    const timeOutGapped = Promise.race([
      onCountrySelectedFired,
      new Promise((_, err) => setTimeout(err, 100)),
    ]);
    expect(timeOutGapped).resolves.not.toBeNull();
  });

  test("Can we create a Serverlist", () => {
    /** @type {ServerList} */
    const element = document.createElement("server-list");
    document.body.append(element);
    // Make sure importing the Module registers the custom element
    expect(customElements.get("server-list")).toBe(ServerList);
    // Make sure once adopted to the dom it has rendered into a shadowdom
    expect(element.shadowRoot).not.toBeNull();
  });

  test("Serverlist element emits a signal if the active city changes", async () => {
    /** @type {ServerList} */
    const element = document.createElement("server-list");
    const newCityEmitted = new Promise((res) => {
      element.addEventListener("selectedCityChanged", (e) => {
        res(e.detail.city.name);
      });
    });
    element.serverList = testServerList;
    document.body.append(element);
    // Wait for lit to render to the dom
    await element.requestUpdate();
    const button = element.shadowRoot.querySelector("input[type='radio']");
    expect(button.dataset.cityName).not.toBeNull();
    button.click();

    const cityName = await Promise.race([
      newCityEmitted,
      new Promise((_, err) => setTimeout(err, 100)),
    ]);
    expect(cityName).toBe(button.dataset.cityName);
  });
});
