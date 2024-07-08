/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {html, render} from "../vendor/lit-all.min.js"

const template = (time) => html`
  <pre>${time}<pre>
`

const renderTime = ()=>{
    const now = new Date()
    render(template(
      `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
    ), document.body);
}

window.setInterval(renderTime,1000);
renderTime();

(() => {
  console.log("Hello from the popup script");
})();
