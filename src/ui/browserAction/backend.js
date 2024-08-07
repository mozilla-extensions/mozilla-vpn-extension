import { getExposedObject } from "../../shared/ipc.js";

export const vpnController = await getExposedObject("VPNController");
export const tabHandler = await getExposedObject("TabHandler");
export const proxyHandler = await getExposedObject("ProxyHandler");

export const ready = Promise.all([vpnController, tabHandler, proxyHandler]);
