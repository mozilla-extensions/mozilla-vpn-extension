/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Component} from './component.js';

let self;

export class Logger extends Component {
  constructor(receiver) {
    super(receiver);
    self = this;
  }

  static logger(category) {
    return (msg, ...rest) => {
      if (self) {
        self.logInternal(category, msg, rest);
      }
    };
  }

  logInternal(category, msg, rest) {
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    };

    const dateTimeFormat = new Intl.DateTimeFormat("en-US", options).format;

    const now = dateTimeFormat(Date.now());
    const r = rest.map(r => JSON.stringify(r)).join(", ");

    const m = `*** Mozilla VPN Extension *** [${now}] [${category}] - ${msg} ${r}`;
    console.log(m);
  }
}
