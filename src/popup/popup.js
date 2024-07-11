/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
* @typedef {import("../background/vpncontroller/states.js").VPNState} VPNState
* @typedef {import("../components/serverlist.js").ServerList} ServerListElement

*/

/** @type {ServerListElement} */
const serverListElement = document.querySelector("server-list")
const controllerPort  = globalThis.chrome.runtime.connect({
    name: "vpncontroller"
});

/** @param {VPNState} state */
const onNewState = (state) =>{
    console.log(state)
    serverListElement.serverList = state.servers;


  
};
controllerPort.onMessage.addListener(onNewState);
