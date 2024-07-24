/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { VPNCard } from "../../components/vpncard.js";

import { html, render } from "../../vendor/lit-all.min.js";

/**
 * @typedef {import("../../background/vpncontroller/states.js").VPNState} VPNState
 * @typedef {import("../../components/serverlist.js").ServerList} ServerListElement
 */

let enabled = false;

const controllerPort = globalThis.chrome.runtime.connect({
  name: "vpncontroller",
});
/** @param {VPNState} state */
const applyToMainPanel = (state) => {
  const panel = document.querySelector("vpn-card");
  if (!panel) {
    console.error("Main panel not found?!");
    return;
  }
  const panelState = VPNCard.propertiesFrom(state);
  panel.enabled = panelState.enabled;
  enabled = panelState.enabled;
  panel.connectedSince = panelState.connectedSince;
};

/** @type {VPNState} */
let currentState;

/** @param {VPNState} state */
const onNewState = (state) => {
  console.log(state);
  currentState = state;
  applyToMainPanel(state);
};
controllerPort.onMessage.addListener(onNewState);

document.querySelector("vpn-card").addEventListener("toggle", () => {
  if (enabled) {
    controllerPort.postMessage("deactivate");
  } else {
    controllerPort.postMessage("activate");
  }
});

// When clicking the "location" button, create a serverlist
// and pop it into the stackview
document.querySelector("#selectLocation").addEventListener("click", () => {
  const sv = document.querySelector("stack-view");

  const closeView = () => {
    sv.pop();
  };

  const viewElement = document.createElement("section");
  render(
    html`
      <vpn-titlebar title="Select Location">
        <img
          slot="left"
          src="../../assets/img/arrow-icon-left.svg"
          @click=${closeView}
        />
      </vpn-titlebar>
      <server-list
        .serverList=${currentState.servers}
        @selectedCityChanged=${closeView}
      >
      </server-list>
    `,
    viewElement
  );
  sv.push(viewElement);
});
