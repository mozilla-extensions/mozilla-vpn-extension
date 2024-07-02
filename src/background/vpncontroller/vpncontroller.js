/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check
import { Component } from "../component.js";
import { Logger } from "../logger.js";

import {
    VPNState,
    StateVPNEnabled,
    StateVPNUnavailable,
    StateVPNDisabled,
    REQUEST_TYPES,
} from './states.js';


const log = Logger.logger("TabHandler");


/**
 * This class owns the Message Port to 
 * talk to the Client. 
 * 
 * It allowes to observe the current State of The Client
 * and send Messages to obtain info
 */
export class VPNController extends Component {

    /**
     * Creates a subscription to recieve updates when the state changes
     * @param {(state: VPNState) => void} callback
     * @returns {Function} - a function to call on cancellation
     */
    subscribe(callback) {
        const listener = {
            postMessage: callback
        }
        this.#contentScriptPorts.push(listener);
        queueMicrotask(() => {
            callback(this.state);
        });
        return () => {
            this.#contentScriptPorts.splice(this.#contentScriptPorts.indexOf(listener), 1);
        };
    }


    get state() {
        return this.#mState;
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
                this.#increaseIsolationKey();
                this.#setState(new StateVPNUnavailable(this.#mState));
            });

        } catch (e) {
            log(e)
            this.#setState(new StateVPNUnavailable(this.#mState));
        }
    }

    async init() {
        this.#setState(await VPNState.fromStorage());
        this.initNativeMessaging();

        globalThis.chrome.runtime.onConnect.addListener(port => {
            if (port.name === 'vpncontroller') {
                this.#onContentScriptConnected(port);
            }
        });
    }
    /**
     * 
     * @param {browser.runtime.Port} cs 
     */
    #onContentScriptConnected(cs) {
        // Queue up a status response
        queueMicrotask(() => {
            cs.postMessage(this.state);
        })
        // Register it for updates
        this.#contentScriptPorts.push(cs);
        // Remove it when disconnected
        cs.onDisconnect.addListener(() => {
            this.#contentScriptPorts.splice(this.#contentScriptPorts.indexOf(cs), 1);
        });
        // If it sends a valid message for the client
        // forward it
        cs.onMessage.addListener((message) => {
            log(message);
            if (REQUEST_TYPES.includes(message.toString())) {
                this.postToApp(message.toString());
            }
        })
    }
    #contentScriptPorts = [];



    /**
     * Sends a message to the client
     * @param { string } command - Command to Send
     */
    postToApp(command) {
        try {
            if (!REQUEST_TYPES.includes(command)) {
                log(`Command ${command} not in known command list`)
            }
            this.#port?.postMessage({ t: command });
        } catch (e) {
            log(e);
            // @ts-ignore
            if (e.toString() === "Attempt to postMessage on disconnected port") {
                this.#setState(new StateVPNUnavailable(this.#mState));
            }
        }
    }

    // Handle responses from MozillaVPN client
    async handleResponse(response) {
        console.log(response)
        if (!response.t) {
            // The VPN Client always sends a ".t : string" 
            // to determing the message type. 
            // If it's not there it's from the bridge. 
            this.handleBridgeResponse(response);
            return;
        }
        switch (response.t) {
            case "servers":
                // @ts-ignore 
                const newState = new this.#mState.constructor({ servers: response.servers.countries });
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
                throw Error("Unexpeted Message type: " + response.t);
        }
    }

    // Called in case we get the message directly from 
    // the native messaging bridge, not the client
    async handleBridgeResponse(response) {
        // We can only get 2 types of messages right now: client-down/up
        if (response.status && response.status === "vpn-client-down") {
            if (this.#mState.installed) {
                this.#setState(new StateVPNUnavailable(this.#mState));
            }
            return;
        }
        // The VPN Just started && connected to Native Messaging
        if (response.status && response.status === "vpn-client-up") {
            queueMicrotask(() => {
                this.postToApp("status");
                this.postToApp("servers");

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

    /** @type {browser.runtime.Port?} */
    #port = null;
    #isolationKey = 0;
    /** @type {VPNState} */
    #mState = new StateVPNUnavailable(null);
};
