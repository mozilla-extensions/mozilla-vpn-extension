/**
 * @jest-environment jsdom
 */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test } from "@jest/globals";
import { render, html } from '../../../src/vendor/lit-all.min.js'

import {
    Server,
    ServerCity,
    ServerCountry
} from '../../../src/background/vpncontroller/states.js'

import {
    cityItem,
    countryListItem,
    serverList,
} from '../../../src/components/serverlist.js'


const testCity =(()=>{
    let x = new ServerCity();
    x.code= "de-de";
    x.name = "Berlino";
    x.lat= 0.01;
    x.long = 0.02;
    x.servers = [
        new Server()
    ];
    return x;
})()
const otherTestCity =(()=>{
    let x = new ServerCity();
    x.code= "uk-uk";
    x.name = "Landon";
    x.lat= 0.01;
    x.long = 0.02;
    x.servers = [
        new Server()
    ];
    return x;
})()




describe('Serverlist Templates', () => {
    test('use jsdom in this test file', () => {
        const element = document.createElement('div');
        expect(element).not.toBeNull();
      });
    test("can we use lit?",()=>{
      const template = html`Hello Wold`;
      const element = document.createElement('div');
      render(template,element);
      expect(element.textContent).toBe("Hello Wold");
    })

    test("serverList renders", ()=>{
      const subListTemplate = (city) => html``;
      const element = document.createElement('div');
      expect(element.innerHTML).toBe("");
      render(serverList([],subListTemplate),element);
      expect(element.innerHTML).not.toBe("");
    })
    test("serverList renders calls the subListTemplate with a city and renders the result", ()=>{
        const subListTemplate = (city) => html`
            <li> 
                <h1 id="${city.name}">I am a List of ${city.name}</h1>
            </li>
        `;
      const element = document.createElement('div');
      render(serverList([{name: "city1"}, {name: "city2"}],subListTemplate),element);

      expect(element.querySelector("#city1")).not.toBeNull();
      expect(element.querySelector("#city2")).not.toBeNull();
    })

    test("cityItem renders", ()=>{
        const element = document.createElement('div');
        expect(element.innerHTML).toBe("");
        render(cityItem(
            testCity,
            otherTestCity,
            ()=>{}
        ),element);
        console.log(element.innerHTML);
        // City name should be there
        expect(element.querySelector(".server-city-name").textContent).toBe(testCity.name);
        // Should not be checked
        expect(element.querySelector(".server-radio-btn").checked).toBe(false);
        // Should fill in the country code 
        expect(element.querySelector(".server-radio-btn").dataset.countryCode).toBe(testCity.code);
        expect(element.querySelector(".server-radio-btn").dataset.cityName).toBe(testCity.name);
    })

    test("cityItem checks the Input if it is the Selected City", ()=>{
        const element = document.createElement('div');
        expect(element.innerHTML).toBe("");
        render(cityItem(
            testCity,
            testCity,
            ()=>{}
        ),element);
        console.log(element.innerHTML);
        // City name should be there
        expect(element.querySelector(".server-city-name").textContent).toBe(testCity.name);
    })


    test("cityItem checks the Input if it is the Selected City", ()=>{
        const element = document.createElement('div');
        expect(element.innerHTML).toBe("");
        render(cityItem(
            testCity,
            testCity,
            ()=>{}
        ),element);
        console.log(element.innerHTML);
        // City name should be there
        expect(element.querySelector(".server-city-name").textContent).toBe(testCity.name);
    })


});
