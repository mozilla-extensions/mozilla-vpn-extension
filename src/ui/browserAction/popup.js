/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { VPNCard } from "../../components/vpncard.js";

/**
 * @typedef {import("../background/vpncontroller/states.js").VPNState} VPNState
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

/** @param {VPNState} state */
const onNewState = (state) => {
  console.log(state);
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
