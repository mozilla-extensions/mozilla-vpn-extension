/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The Component class serves as a base class
 * for other classes that need to interact with
 * a central event handling mechanism.
 */
export class Component {
  #receiver;

  constructor(receiver) {
    this.#receiver = receiver;
    receiver.registerObserver(this);
  }

  // In case we need to overwrite
  async init() {}

  async handleEvent() {}

  // Returns an async response from the main
  sendMessage(type, data) {
    return this.#receiver.handleEvent(type, data);
  }
}
