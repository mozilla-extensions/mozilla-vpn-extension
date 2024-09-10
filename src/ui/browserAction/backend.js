import { getExposedObject } from "../../shared/ipc.js";

export const vpnController = await getExposedObject("VPNController");
export const extController = await getExposedObject("ExtensionController")
export const proxyHandler = await getExposedObject("ProxyHandler");

export const ready = Promise.all([vpnController, proxyHandler]);
