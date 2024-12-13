import { getExposedObject } from "../../shared/ipc.js";

/**
 * Import Types
 *
 * @typedef {import("../../shared/property.js").IBindable} IBindable
 * @typedef {import("../../background/vpncontroller/states.js").ServerCountry} ServerCountry
 * @typedef {import("../../background/vpncontroller/states.js").ServerCity} ServerCity
 * @typedef {import("../../background/vpncontroller/states.js").VPNState} State
 * @typedef {Array<ServerCountry>} ServerCountryList
 */

/**
 * Manually define the types for convinence, please update if making changes :)
 *
 * @typedef {Object} vpnController
 * @property {IBindable<any>} featureList - A bindable property that contains the list or configuration of VPN servers.
 * @property {IBindable<ServerCountryList>} servers - A bindable property that contains the list or configuration of VPN servers.
 * @property {IBindable<Boolean>} isExcluded - A bindable property that indicates whether the VPN is excluded from certain operations.
 * @property {IBindable<State>} state - A bindable property representing the current state of the VPN controller (e.g., connected, disconnected).
 * @property {(String)=>Promise<bool> } postToApp - A function that handles posting messages or data from the VPN controller to the application.
 * @property {IBindable<Number>} isolationKey - A bindable property used to manage and isolate VPN sessions or connections.
 */
/**
 * @type {vpnController}
 */
export const vpnController = await getExposedObject("VPNController");
export const extController = await getExposedObject("ExtensionController");
export const proxyHandler = await getExposedObject("ProxyHandler");
export const onboardingController = await getExposedObject("OnboardingController");
export const butterBarService = await getExposedObject("ButterBarService");

export const ready = Promise.all([vpnController, proxyHandler]);
