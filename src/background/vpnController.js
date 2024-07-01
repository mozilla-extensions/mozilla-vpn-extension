/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
import {Component} from "./component.js";

import {Logger} from "./logger.js";

const log = Logger.logger("VPNController");

const MOZILLA_VPN_SERVERS_KEY = "mozillaVpnServers";
const MOZILLA_VPN_HIDDEN_TOUTS_LIST_KEY = "mozillaVpnHiddenToutsList";

/**
 * Commands we know we can send 
 * to the vpn
 */
export const REQUEST_TYPES = [
  "activate",
  "servers",
  "disabled_apps",
  "status"
]


class VPNState {
  // Name of the current state
  state="";
  // If the Native Message adapter is installed
  installed = false;
  // True if the VPN is enabled.
  connected = false;
  /**
   * A socks:// url to connect to
   * to bypass the vpn. 
   * Is null if it's not supported or active. 
   * @type {string | boolean}
   */
  loophole = false; 
  // A List of servers
  servers = [];

  /**
   * Constructs state of another state, moving 
   * non essential data. 
   * 
   * @param {VPNState?} other
   */
  constructor(other){
    if(other){
      this.servers= [...other.servers];
    }
  }

 /**
  * Takes a state, fetches data from storage and then 
  * constructs a copy with the data included. 
  * 
  * @param {VPNState} state - The state to replicate
  * @param {browser.storage.StorageArea} storage - The storage area to look for
  * @returns {Promise<VPNState>} - Returns a copy of the state, or the same in case of missing data.
  */
  static async fromStorage(state = new StateVPNUnavailable(), storage = browser.storage.local){
  const { mozillaVpnServers } = await storage.get(MOZILLA_VPN_SERVERS_KEY);
  if (typeof(mozillaVpnServers) === "undefined") {
    await storage.set({ [MOZILLA_VPN_SERVERS_KEY]:[] });
    await storage.set({ [MOZILLA_VPN_HIDDEN_TOUTS_LIST_KEY]:[] });
    return state; 
  }
  return new state.constructor({
        servers: mozillaVpnServers
      });
  }
  // Puts a state's data into storage, to make sure we can recreate it next time using 
  // fromStorage()
  static async putIntoStorage(state = new StateVPNUnavailable(), storage = browser.storage.local){
    storage.set({ [MOZILLA_VPN_SERVERS_KEY]: state.servers});
  }
}

/**
 * This state is used if the Native Message Port is not 
 * available. 
 */
class StateVPNUnavailable extends VPNState {
  state="Unavailable";
  installed = false;
  connected = false;
}

/**
 * This state is used if the VPN Client is 
 * alive but the Connection is Disabled
 */
class StateVPNDisabled extends VPNState {
  state="Disabled";
  installed = true;
  connected = false;
}


/**
 * This state is used if the VPN Client is 
 * alive but the Connection is Disabled
 */
class StateVPNEnabled extends VPNState {
  /**
   * 
   * @param {VPNState} other - 
   * @param {string|boolean} loophole - False if loophole is not supported, 
   */
  constructor(other, aloophole){
    super(other);
    this.loophole = other.loophole; 
    if(aloophole){
      this.loophole = aloophole;
    }
  }

  state ="Enabled"
  installed = true;
  connected = true;
}

/**
 * This class owns the Message Port to 
 * talk to the Client. 
 * 
 * It allowes to observe the current State of The Client
 * and send Messages to obtain info
 */
export class VPNController extends Component {

    get state() {
      return  this.#mState;
    };
    /**
     * Freezes a state object, then adopts it. 
     * @param {VPNState} state 
     */
    #setState(state) {
      Object.freeze(state);
      this.#mState = state;
      this.#contentScriptPorts.forEach(port => port.postMessage(state));
      log(`State -> ${state.state}`)
    } 

  
    async initNativeMessaging() {
      log("initNativeMessaging");
      if (this.#port && this.#port.error === null) {
        return;
      }
      try {
        /*
            Find a way to not spam the console when MozillaVPN client is not installed
            File at path ".../../MozillaVPN/..." is not executable.` thrown by resource://gre/modules/Subprocess.jsm:152`
            Which does is not caught by this try/catch
        */
        this.#port = browser.runtime.connectNative("mozillavpn");
        this.#port.onMessage.addListener(response => this.handleResponse(response));
  
        this.postToApp("status");
        this.postToApp("servers");
  
        // When the mozillavpn dies or the VPN disconnects, we need to increase
        // the isolation key in order to create new proxy connections. Otherwise
        // we could see random timeout when the browser tries to connect to an
        // invalid proxy connection.
        this.#port.onDisconnect.addListener(() => {
          this.increaseIsolationKey();
          this.#setState(new StateVPNUnavailable(this.#mState));
        });
  
      } catch(e) {
        log(e)
        this.#setState(new StateVPNUnavailable(this.#mState));
      }
    }
  
    async init() {
      this.#setState(await VPNState.fromStorage());
      this.initNativeMessaging();

      chrome.runtime.onConnect.addListener(port=> {
        if (port.name === 'vpncontroller') {
          this.#onContentScriptConnected(port);
        }
      });

    }
    /**
     * 
     * @param {browser.runtime.Port} cs 
     */
    #onContentScriptConnected(cs){
      // Queue up a status response
      queueMicrotask(()=>{
        cs.postMessage(this.state);
      })
      // Register it for updates
      this.#contentScriptPorts.push(cs);
      // Remove it when disconnected
      cs.onDisconnect.addListener(()=>{
        this.#contentScriptPorts.splice(this.#contentScriptPorts.indexOf(cs), 1);
      });
      // If it sends a valid message for the client
      // forward it
      cs.onMessage.addListener((message)=>{
        log(message);
        if(REQUEST_TYPES.includes(command)){
          this.postToApp(message);
        }
      })
    }
    /** @type {Array<browser.runtime.Port>} } */
    #contentScriptPorts = [];



    /**
     * Sends a message to the client
     * @param { string } command - Command to Send
     */
    postToApp(command) {
      try {
        if(!REQUEST_TYPES.includes(command)){
          log(`Command ${command} not in known command list`)
        }
        this.#port.postMessage({t: command});
      } catch(e) {
        log(e);
        if (e.message === "Attempt to postMessage on disconnected port") {
          this.#setState(new StateVPNUnavailable(this.#mState));
        }
      }
    }

    // Handle responses from MozillaVPN client
    async handleResponse(response) {
      console.log(response)
      if(!response.t){
        // The VPN Client always sends a ".t : string" 
        // to determing the message type. 
        // If it's not there it's from the bridge. 
        this.handleBridgeResponse(response);
        return;
      }
      switch(response.t){
        case "servers":
          const newState = new this.#mState.constructor({servers: response.servers.countries});
          VPNState.putIntoStorage(newState);
          this.#setState(newState);
          break;
        case "disabled_apps":
          // Todo: what do we do here?
          break;
        case "status":
          const status = response.status;
          const controllerState = status.vpn;
          if (controllerState === "StateOn") {
            this.#setState(new StateVPNEnabled(this.#mState, status.localProxy?.url));
            return;
          }
          if (controllerState === "StateOff" || controllerState === "StateDisconnecting") {
            this.#setState(new StateVPNDisabled(this.#mState));
            return;
          }
          // Let's increase the network key isolation at any vpn status change.
          this.#increaseIsolationKey();
          break;
        default:
          throw Error("Unexpeted Message type: "+ response.t);
      }
    }

    // Called in case we get the message directly from 
    // the native messaging bridge, not the client
    async handleBridgeResponse(response){
      // We can only get 2 types of messages right now: client-down/up
      if (response.status && response.status ==="vpn-client-down") {
        if(this.#mState.installed){
          this.#setState(new StateVPNUnavailable(this.#mState));
        }
        return;
      }
      if (response.status && response.status ==="vpn-client-up") {
        queueMicrotask(()=>{
          this.postToApp("status");
        });
        return;
      }
    }

  

    /**
     * The isolation key is used to make sure
     * for each unique vpn session we get a 
     * unique proxy connection, so that
     * when the vpn reconnects an old proxy 
     * tcp handle (which is now invalid) is not reused. 
     *
     * @readonly
     * @type {number}
     */
    get isolationKey() {
      return this.#isolationKey;
    }

    #increaseIsolationKey() {
      ++this.#isolationKey;
    }

    /** @type {browser.runtime.Port} */
    #port;
    #isolationKey = 0;
    /** @type {VPNState} */
    #mState = new StateVPNUnavailable();
  };
