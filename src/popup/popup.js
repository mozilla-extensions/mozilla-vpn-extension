/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


(() => {
  console.log("Hello from the popup script");
})();



const port  = globalThis.chrome.runtime.connect({
  name: "vpncontroller"
});


port.onMessage.addListener(msg =>{
  document.querySelector("#log").innerHTML = JSON.stringify(msg);
});
