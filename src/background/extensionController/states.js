/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXTENSION_STATE_KEY="extensionState";

export class ExtensionState {
  // Name of the current state
  state = ""; 

  /**
   * Constructs state of another state, moving
   * non essential data.
   *
   * @param {ExtensionState?} other
   */
  constructor(other) {
    if (!other) {
      return;
    }
  }

  /**
   * Takes a state, fetches data from storage and then
   * constructs a copy with the data included.
   *
   * @param {ExtensionState} state - The state to replicate
   * @param {browser.storage.StorageArea} storage - The storage area to look for
   * @param {String} key - The key to put the state in
   * @returns {Promise<ExtensionState>} - Returns a copy of the state, or the same in case of missing data.
   */
  static async fromStorage(
    state = new StateExtensionLoading(null),
    storage = browser.storage.local,
  ) {
    const { extensionState } = await storage.get(EXTENSION_STATE_KEY);
    if (typeof extensionState === "undefined") {
      await storage.set({ [EXTENSION_STATE_KEY]: state });
      return state;
    }
    return new state.constructor({
      state: state,
    });
  }


  /**  Puts a state's data into storage, to make sure we can recreate it next time using
   * @param {ExtensionState} state - The state to replicate
   * @param {browser.storage.StorageArea} storage - The storage area to look for
   */
  static putIntoStorage(
    state = new StateExtensionLoading(null),
    storage = browser.storage.local,
    key = EXTENSION_STATE_KEY
  ) {
    // @ts-ignore
    storage.set({ [key]: state.state });
  }
}

/**
 * The extension is in StateExtensionLoading when
 * we're initializing and/or determining client 
 * connectivity and availability.
 */
 export class StateExtensionLoading extends ExtensionState {
  state = "Loading";
}

/**
 * The extension is in StateExtensionOn when:
 *    1. The VPN client is On
 *    2. The extension "VPN" is On
 * In this state site traffic is only proxied
 * if a custom location or exclusion setting
 * exists for the origin.
 */
 export class StateExtensionOn extends ExtensionState {
  state = "On";
}

/**
 * The extension is in StateExtensionOff when:
 *    1. The VPN client is Off
 *    2. The extension "VPN" is Off
 * In this state, no traffic is proxied
 */
 export class StateExtensionOff extends ExtensionState {
  state = "Off";
}


/**
 * The extension is in StateExtensionDisabled when:
 *    1. The VPN client is On
 *    2. The extension "VPN" is Off
 * In this state, all traffic is proxied through
 * the local socks proxy.
 */
export class StateExtensionOffPartial extends ExtensionState {
  state = "OffPartial";
}

/**
 * The extension is in StateExtensionOnPartial when:
 *    1. The VPN client is Off
 *    2. The extension VPN is On
 * In this state, all traffic is proxied through a
 * server located in the city where the VPN client was
 * last connected UNLESS unless a custom location 
 * exists for the origin.
 */
export class StateExtensionOnPartial extends ExtensionState {
  state = "OnPartial";
}


// export class StateExtensionExcluded extends ExtenstionState {

// }

// export class StateExetensionOnboarding extends ExtensionState {
//   currentPanel = 0
// }


// export class StateExtensionClientUnavailable extends ExtensionState {

// }