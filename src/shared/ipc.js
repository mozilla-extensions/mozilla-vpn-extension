/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

/**
 * IPC
 *
 * This module essentially allows for structured communication between different
 * components of a browser extension.
 * It abstracts away the complexities of IPC by providing a way for defining properties,
 * handling messages, and creating replicas of objects that can be controlled remotely.
 *
 * The 2 Core Functions are expose() and getReplica()
 * (All the others are plumbing and should be ignored :) )
 *
 * expose():
 * Creates IPC functions and a Port Message handler for an object.
 * All it needs is a PropertyDescriptor to know which fields and functions should be
 * exposed by the service.
 *
 * class MyTestService{
 *   static properties = {
 *      readOnlyMember: PropertyType.Value
 *      aReadWriteMember: PropertyType.Writables.Value
 *      aIBindable: PropertyType.Bindable
 *      someCallableFunction: PropertyType.Function
 *   }
 *  readonlyMember = true, // This will not be writable
 *  aReadWriteMember = "this can be changed!" // You can also use a set() here to listen to changes
 *  someCallabcleFunction(args){ console.log(args) }
 *  aIBindable = property("some_value")
 * }
 *
 * based on the PropertyDescriptor it will create Function a  (in:IPCMessage) => out:IPCMessage
 * for each of the actions allowed on a property.
 * All Handler functions are stored in a Map.
 *
 * expose() will listen to any port connection and if the `name` is equal to the Name of the exposed class
 * it will attach the generated IPC_Message Handlers to the port.
 *
 *
 * getExposedObject(name):
 *
 * getExposedObject opens a Port with the provided name and builds a replica.
 * -> It queries the `static properties ` of the underlying Object using an IPC_INFO request.
 * Once it has the info it will build replicas:
 * -> For each fn(t)=>x it will generate a fn(t)=>Promise<x> that will make an IPC call and unpack the result
 * -> For each value<t> it will generate a getter<Promise<t> that will make an IPC call to fetch the current value
 * -> For each setter<t> ... you get the idea.
 *
 * -> IBindables are a bit special. It will create a new Property<T>, and update it's value when it changes, but only returning a readonly bindable.
 * - Only allowing for a one-way data binding.
 *
 * Due to the way Postmessage works only "simple" values structured Clone supports are transmittable.
 *
 * Usage:
 *
 * In the Background Script:
 *
 * expose(new MyTestService());
 *
 * In the Popup:
 *
 * const service = getExposedObject("MyTestService");
 * console.log(await service.readOnlyMember)
 * await service.someCallableFunction("cool argument")
 *
 *
 *
 *
 *
 */

import { IBindable, property, ReadOnlyProperty } from "./property.js";

export const getExposedObject = async (name = "ohno", maxRetrys = 20) => {
  // TODO: Lesley noted this port might disconnect
  // So we should handle this here and auto hook up a new
  // port with the message port JUST IN CASE.
  /** @type {browser.runtime.Port} */

  /** @type {IPC_INFO_MESSAGE?} */
  let info = null;
  let port;
  /** @type {MessagePort?} */
  let messagePort = null;
  for (let retryCount = 0; retryCount <= maxRetrys && !info; retryCount++) {
    if (!port) {
      port = globalThis.chrome.runtime.connect({ name });
    }
    messagePort = toMessagePort(port);
    try {
      // @ts-ignore
      info = await requestFromPort(
        messagePort,
        {
          ...new IPC_INFO_MESSAGE(),
          id: makeID(),
        },
        100 + Math.pow(2, Math.min(retryCount, 10)) // Scale from 1ß2ms -> 1124ms Delay between attempts
      );
    } catch (error) {
      if (port) {
        port.disconnect();
        port = null;
      }
      console.log(
        `Attempt ${retryCount}/${maxRetrys} to fetch ${name}-Info failed.`
      );
    }
  }
  if (info == null) {
    throw new Error(`Background script did not Provide info for ${name}`);
    return;
  }
  if (!messagePort) {
    throw new Error(`Failed to establish a message port`);
    return;
  }

  return await createReplica(info.data, messagePort);
};

/**
 * Creates a  browser.runtime.onConnect listener
 * for ${object} and set's up IPC Message handlers
 * based on it's ${PropertyDescriptor}
 *
 * @typedef {{ constructor:{
 *  name: String,
 *  properties:PropertyDescriptor
 * }} } ExposableObj
 * @param { ExposableObj } object - Any Object that has Properties, really.
 */
export const expose = (object) => {
  const name = object.constructor.name;
  const propertyDescription = object.constructor.properties;
  if (!propertyDescription) {
    throw new Error(
      "Cannot Expose an Object without a 'static properties{}' definition!"
    );
  }
  const messageHandler = createMessageHandlers(object, propertyDescription);
  browser.runtime.onConnect.addListener(async (port) => {
    if (port.name != name) {
      return;
    }
    const stopSubscriptions = pushBindables(object, propertyDescription, port);
    port.onDisconnect.addListener(stopSubscriptions);
    port.onMessage.addListener((message) => {
      // Merge an empty message, to make sure all
      // fields exist.
      const ipcMessage = {
        ...new IPCMessage(),
        ...message,
      };
      getResponse(messageHandler, ipcMessage)
        .then((response) => {
          port.postMessage(response);
        })
        .catch(console.error);
    });
  });
};

const makeID = () => {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return array[0];
};

export class PropertyDescription {
  /**
        @typedef {{[key: string]: PropertyDescription;}} PropertyDescriptor 
        @typedef {"Function"|"Bindable"|"Value"} PropertyType
        @type {PropertyType} */
  type = "Value";
  // If readonly, no setter will be generated
  readonly = false;
}
export const PropertyType = {
  Writeables: {
    /** @type {PropertyDescription} */
    Value: { type: "Value", readonly: false },
    /** @type {PropertyDescription} */
    Function: { type: "Function", readonly: false },
    /** @type {PropertyDescription} */
    Bindable: { type: "Bindable", readonly: false },
  },
  /** @type {PropertyDescription} */
  Value: { type: "Value", readonly: true },
  /** @type {PropertyDescription} */
  Function: { type: "Function", readonly: true },
  /** @type {PropertyDescription} */
  Bindable: { type: "Bindable", readonly: true },
};

const ACTION_READ = "READ";
const ACTION_CALL = "CALL";
const ACTION_SET = "SET";
const ACTION_INFO = "INFO";
const ACTION_PUSH = "PUSH";

export class IPCMessage {
  type = "READ";
  id = 0;
  name = "";
}
export class IPC_READMESSAGE extends IPCMessage {
  type = ACTION_READ;
}
export class IPC_WRITEMESSAGE extends IPCMessage {
  type = ACTION_SET;
  data;
}
export class IPC_CALLMESSAGE extends IPCMessage {
  type = ACTION_CALL;
  data = [];
}
export class IPC_READ_RESPONSE extends IPCMessage {
  type = ACTION_READ;
  ok = false;
  data;
}
export class IPC_PUSH_MESSAGE extends IPCMessage {
  type = ACTION_PUSH;
  data;
}
export class IPC_WRITE_RESPONSE extends IPCMessage {
  type = ACTION_SET;
  ok = false;
}
export class IPC_CALL_RESPONSE extends IPCMessage {
  type = ACTION_CALL;
  ok = false;
  data;
}
export class IPC_INFO_MESSAGE extends IPCMessage {
  type = ACTION_INFO;
  /** @type {PropertyDescriptor} */
  data = {};
}
export class IPC_INFO_RESPONSE extends IPCMessage {
  type = ACTION_INFO;
  data = {};
}

export class MessageHandlerMap {
  /**d
   * @template T
   * @typedef {function(T): (Promise<IPCMessage>|undefined)} MessageCallBack
   */

  /** @type {Array<MessageCallBack<IPC_READMESSAGE>>} */
  READ = [];
  /** @type {Array<MessageCallBack<IPC_CALLMESSAGE>>} */
  CALL = [];
  /** @type {Array<MessageCallBack<IPC_WRITEMESSAGE>>} */
  SET = [];
  /** @type {Array<MessageCallBack<IPC_INFO_MESSAGE>>} */
  INFO = [];
}

export function getResponse(
  handler = new MessageHandlerMap(),
  message = new IPCMessage()
) {
  const callbackList = handler[message.type];
  if (!callbackList) {
    return Promise.reject(`Invalid Message Type ${message.type}`);
  }
  // The Handler either return a Promise (in case they accept the request)
  // or "undefined" in case the handler was not responsible for the request.
  const acceptedPromises = callbackList
    .map((cb) => cb(message))
    .filter((p) => p);
  if (acceptedPromises.length == 0) {
    return Promise.reject(
      `No Message Handler Accepted ${message.type}/${message.name}`
    );
  }
  return Promise.any(acceptedPromises);
}
export const createReadHandler = (object, name) => {
  return (message = new IPC_READMESSAGE()) => {
    if (message.type != ACTION_READ) {
      return;
    }
    if (message.name != name) {
      return;
    }
    const value = object[name];
    return Promise.resolve({
      ...new IPC_READ_RESPONSE(),
      id: message.id,
      data: value,
      ok: true,
    });
  };
};
export const createBindableReadHandler = (object, name) => {
  return (message = new IPC_READMESSAGE()) => {
    if (message.type != ACTION_READ) {
      return;
    }
    if (message.name != name) {
      return;
    }
    const value = object[name].value;
    return Promise.resolve({
      ...new IPC_READ_RESPONSE(),
      id: message.id,
      data: value,
      ok: true,
    });
  };
};

export const createWriteHandler = (object, name) => {
  return (message = new IPC_WRITEMESSAGE()) => {
    if (message.type != ACTION_SET) {
      return;
    }
    if (message.name != name) {
      return;
    }
    object[name] = message.data;
    return Promise.resolve({
      ...new IPC_WRITE_RESPONSE(),
      id: message.id,
      ok: true,
    });
  };
};
export const createBindableWriteHandler = (object, name) => {
  return (message = new IPC_WRITEMESSAGE()) => {
    if (message.type != ACTION_SET) {
      return;
    }
    if (message.name != name) {
      return;
    }
    object[name].value = message.data;
    return Promise.resolve({
      ...new IPC_WRITE_RESPONSE(),
      id: message.id,
      ok: true,
    });
  };
};
export const createCallHandler = (object, name) => {
  return (message = new IPC_CALLMESSAGE()) => {
    if (message.type !== ACTION_CALL) {
      return;
    }
    if (message.name != name) {
      return;
    }
    try {
      const result = object[name].apply(object, message.data);
      if (result && result.then) {
        // If it is a Promise return the chained promise.
        result.catch(console.error);
        return result.then((data) => {
          return {
            ...new IPC_CALL_RESPONSE(),
            id: message.id,
            ok: true,
            data,
          };
        });
      }
      return Promise.resolve({
        ...new IPC_CALL_RESPONSE(),
        id: message.id,
        ok: true,
        data: result,
      });
    } catch (error) {
      console.error(error);
      return Promise.resolve({
        ...new IPC_CALL_RESPONSE(),
        id: message.id,
        ok: false,
        data: error,
      });
    }
  };
};
export const createInfoHandler = (object) => {
  return (message = new IPC_INFO_MESSAGE()) => {
    if (message.type !== ACTION_INFO) {
      return;
    }
    const propertyDescription = object?.constructor?.properties;
    return Promise.resolve({
      ...new IPC_INFO_RESPONSE(),
      id: message.id,
      ok: true,
      name: object?.constructor?.name,
      data: propertyDescription,
    });
  };
};
/**
 *
 * @param {any} object - The Object to create handlers for
 * @param {PropertyDescriptor} propertyMap - Its PropertyDescriptor
 * @returns
 */
export const createMessageHandlers = (object, propertyMap) => {
  // We will throw all read/write callbacks this object can recieve here.
  const objectMessageHandler = new MessageHandlerMap();
  objectMessageHandler.INFO.push(createInfoHandler(object));
  Object.entries(propertyMap).forEach(([name, description]) => {
    if (description.type == "Function") {
      objectMessageHandler.CALL.push(createCallHandler(object, name));
      return;
    }
    if (description.type == "Bindable") {
      objectMessageHandler.READ.push(createBindableReadHandler(object, name));
      if (!description.readonly) {
        objectMessageHandler.SET.push(createBindableWriteHandler(object, name));
      }
      return;
    }
    objectMessageHandler.READ.push(createReadHandler(object, name));
    if (!description.readonly) {
      objectMessageHandler.SET.push(createWriteHandler(object, name));
    }
  });
  return objectMessageHandler;
};

/**
 * Takes an Object, checks it's bindables and creates a subscription
 * on each bindable, passing updates to the port.
 *
 * @param {any} object - The Object to create handlers for
 * @param {PropertyDescriptor} propertyMap - Its PropertyDescriptor
 * @param {{postMessage(any)}} port - The port to send updates to.
 * @returns {()=>void} A callback to stop the created subscriptions
 */
export const pushBindables = (object, propertyMap, port) => {
  const stopFunctions = [];

  Object.entries(propertyMap)
    .filter(([_, description]) => description.type === "Bindable")
    .forEach(([name, _]) => {
      /** @type {IBindable} */
      let bindable = object[name];
      const stop = bindable.subscribe((v) => {
        port.postMessage({
          ...new IPC_PUSH_MESSAGE(),
          data: v,
          name: name,
          id: makeID(),
        });
        stopFunctions.push(stop);
      });
    });
  return () => {
    stopFunctions.forEach((f) => f());
  };
};

/**
 *
 * @param {String} name
 * @param {MessagePort} port
 */
export const createReplicaFunction = (name, port) => {
  /**
   * @param {any} args -
   */
  return async (...args) => {
    const message = new IPC_CALLMESSAGE();
    message.data = args;
    message.id = makeID();
    message.name = name;
    try {
      const response = await requestFromPort(port, message);
      const ipcResponse = {
        ...new IPC_CALL_RESPONSE(),
        ...response,
      };
      if (!ipcResponse.ok) {
        throw new Error(ipcResponse.data);
      }
      return ipcResponse.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Error while Sending Call Request: ${error.toString()}`
        );
      }
    }
  };
};
export const createReplicaGetter = (name, port) => {
  return async () => {
    const message = new IPC_READMESSAGE();
    message.id = makeID();
    message.name = name;
    try {
      const response = await requestFromPort(port, message);
      const ipcResponse = {
        ...new IPC_READ_RESPONSE(),
        ...response,
      };
      if (!ipcResponse.ok) {
        throw new Error(ipcResponse.data);
      }
      return ipcResponse.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error while Sending Get Request: ${error.toString()}`);
      }
    }
  };
};
export const createReplicaSetter = (name, port) => {
  /**
   * @param {any} value -
   */
  return async (value) => {
    const message = new IPC_WRITEMESSAGE();
    message.id = makeID();
    message.name = name;
    message.data = value;
    try {
      const response = await requestFromPort(port, message);
      const ipcResponse = {
        ...new IPC_WRITE_RESPONSE(),
        ...response,
      };
      if (!ipcResponse.ok) {
        throw new Error("Failed to write to remote field");
      }
      return;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Error while Sending Call Request: ${error.toString()}`
        );
      }
    }
  };
};

/**
 *
 * @param {String} name - name of the Property
 * @param {MessagePort} port - Message port
 * @returns {Promise<ReadOnlyProperty<any>>} - A readonly Property
 */
export const createReplicaBindable = async (name, port) => {
  const getValue = createReplicaGetter(name, port);
  const currentValue = await getValue();

  const internalProp = property(currentValue);
  port.addEventListener("message", (event) => {
    /** @type {IPC_PUSH_MESSAGE} */
    const message = {
      ...new IPC_PUSH_MESSAGE(),
      ...event.data,
    };
    if (message.name === name && message.type === ACTION_PUSH) {
      internalProp.propose(message.data);
    }
  });
  return internalProp.readOnly;
};

/**
 *
 * @param {PropertyDescriptor} propertyMap
 * @param {MessagePort} port
 */

export const createReplica = async (propertyMap, port) => {
  const replica = {};

  await Promise.all(
    Object.entries(propertyMap).map(async ([name, description]) => {
      if (description.type == "Function") {
        replica[name] = createReplicaFunction(name, port);
        return;
      }
      if (description.type == "Value") {
        if (description.readonly) {
          Object.defineProperty(replica, name, {
            get: createReplicaGetter(name, port),
          });
          return;
        }
        Object.defineProperty(replica, name, {
          get: createReplicaGetter(name, port),
          set: createReplicaSetter(name, port),
        });
        return;
      }
      if (description.type == "Bindable") {
        replica[name] = await createReplicaBindable(name, port);
        return;
      }
      throw new Error(`Unsupported PropertyType : ${description.type}`);
    })
  );
  return replica;
};

/**
 * Takes a browser Port and Hooks it up to a
 * Message Channel port.
 *
 * @param {browser.runtime.Port} extensionPort - a runtime.Port
 * @returns {MessagePort} - A hooked up Message Port
 */
export const toMessagePort = (extensionPort) => {
  const { port1, port2 } = new MessageChannel();
  port1.addEventListener("message", (m) => {
    extensionPort.postMessage(m.data);
  });
  extensionPort.onMessage.addListener((m) => {
    port1.postMessage(m);
  });
  //extensionPort.onDisconnect.addListener(port1.close);
  port1.start();
  port2.start();
  return port2;
};

/**
 * Sends an IPC Message over the port and resolves once
 * an appropriate response is recieved or a timeout happened
 *
 * @param {MessagePort} port - The port to use.
 * @param {IPCMessage} message - The Message to Send
 * @param {Number} maxTimeout - MS to wait until the Promise Rejects
 * @returns {Promise<IPCMessage>}
 */
export const requestFromPort = (
  port,
  message = new IPCMessage(),
  maxTimeout = 3000
) => {
  /** @type {Promise<IPCMessage>} */
  const hasMessage = new Promise((resolve) => {
    const listener = (messageEvent = new MessageEvent("")) => {
      const ipcMessage = {
        ...new IPCMessage(),
        ...messageEvent.data,
      };
      if (ipcMessage.type != message.type) {
        return;
      }
      if (ipcMessage.id === message.id) {
        port.removeEventListener("message", listener);
        resolve(ipcMessage);
      }
    };
    port.addEventListener("message", listener);
    port.postMessage(message);
  });
  const timeout = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Timed out while waiting for (${message.type})${message.name}:${message.id}`
        )
      );
    }, maxTimeout);
    // Cancel the timeout on success
    hasMessage.then(() => {
      clearTimeout(timer);
    });
  });
  return Promise.race([hasMessage, timeout]);
};
