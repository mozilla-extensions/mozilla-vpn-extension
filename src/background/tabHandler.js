/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Component} from "./component.js";
import {Logger} from "./logger.js";

const log = Logger.logger("TabHandler");

export class TabHandler extends Component {  
  constructor(receiver) {
    super(receiver);
  }

  init() {
    log("Initializing TabHandler");
    browser.tabs.onUpdated.addListener((a,b) => this.maybeShowIcon(a,b)); 
    browser.tabs.onActivated.addListener((a,b) => this.maybeShowIcon(a,b));
  }

  async maybeShowIcon(tabId, tabUrl) {
    log(`Setting tab icon for ${tabUrl}`);
    browser.pageAction.setIcon({
      path: "../assets/logos/logo-light.svg",
      tabId
    });
    
    return browser.pageAction.show(tabId);
  }
}


