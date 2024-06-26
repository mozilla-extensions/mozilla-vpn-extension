/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class Main {
  constructor() {
  }

  async init() {
    console.info("Hello from the background script!");
  } 
}

const main = new Main();
main.init();