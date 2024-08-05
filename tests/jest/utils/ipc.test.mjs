/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, test } from "@jest/globals";
import {
  requestFromPort,
  IPCMessage,
  IPC_READMESSAGE,
  createReadHandler,
  createInfoHandler,
  createWriteHandler,
  createCallHandler,
  PropertyType,
  createMessageHandlers,
  MessageHandlerMap,
  getResponse,
  createBindableReadHandler,
  createBindableWriteHandler,
  pushBindables,
  createReplicaFunction,
  createReplicaGetter,
  createReplicaSetter,
  createReplicaBindable,
} from "../../../src/shared/ipc";

import { property } from "../../../src/shared/property";

// There is no crypto module in jest, so let's use super random values
Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: (arr) => [1, 2, 3, 4],
  },
});

describe("InfoHandler", () => {
  it("Can Handle Null Messages", async () => {
    const handler = createInfoHandler({});
    await handler();
  });
  it("Can Handle InfoMessage", async () => {
    class TestObject {
      static properties = {
        sayHi: PropertyType.Function,
        x: PropertyType.Boolean,
      };
    }
    const handler = createInfoHandler(new TestObject());
    const message = {
      id: 42,
      type: "INFO",
    };
    const result = await handler(message);
    expect(JSON.stringify(result.data)).toBe(
      JSON.stringify(TestObject.properties)
    );
    expect(result.name).toBe("TestObject");
  });
  it("Ignores non Info Messages", async () => {
    class TestObject {
      static properties = {
        sayHi: PropertyType.Function,
        x: PropertyType.Boolean,
      };
    }
    const handler = createInfoHandler(new TestObject());
    const message = {
      id: 42,
      type: "INFOOOOOOOO",
    };
    const result = handler(message);
    expect(result).toBeUndefined();
  });
});
describe("Readhandler", () => {
  it("Can Handle Null Messages", async () => {
    const testObj = {};
    const handler = createReadHandler(testObj, "x");
    await handler();
  });
  it("Can Handle ReadMessage", async () => {
    const testObj = {
      x: "hello",
    };
    const handler = createReadHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "READ",
    };
    const result = await handler(message);
    expect(result.data).toBe(testObj.x);
    expect(result.id).toBe(message.id);
  });
  it("Can Handle Non-Existent Properties", async () => {
    const testObj = {
      x: "hello",
    };
    const handler = createReadHandler(testObj, "x");
    const message = {
      id: 42,
      name: "nonexistent",
      type: "READ",
    };
    expect(handler(message)).toBeUndefined();
  });
  it("Ignores Non Read Messages", async () => {
    const testObj = {
      x: "hello",
    };
    const handler = createReadHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "WRITE",
    };
    expect(handler(message)).toBeUndefined();
  });
});
describe("createBindableReadHandler", () => {
  it("Can Handle Null Messages", async () => {
    const testObj = {};
    const handler = createBindableReadHandler(testObj, "x");
    await handler();
  });
  it("Can Handle ReadMessage", async () => {
    const testObj = {
      x: property("hello"),
    };
    const handler = createBindableReadHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "READ",
    };
    const result = await handler(message);
    expect(result.data).toBe(testObj.x.value);
    expect(result.id).toBe(message.id);
  });
  it("Can Handle Non-Existent Properties", async () => {
    const testObj = {
      x: property("hello"),
    };
    const handler = createBindableReadHandler(testObj, "x");
    const message = {
      id: 42,
      name: "nonexistent",
      type: "READ",
    };
    expect(handler(message)).toBeUndefined();
  });
  it("Ignores Non Read Messages", async () => {
    const testObj = {
      x: property("hello"),
    };
    const handler = createBindableReadHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "WRITE",
    };
    expect(handler(message)).toBeUndefined();
  });
});
describe("WriteHandler", () => {
  it("Can Handle Null Messages", async () => {
    const testObj = {
      x: "hello",
    };
    const handler = createWriteHandler(testObj, "x");
    await handler();
  });
  it("Can Handle WriteMessages", async () => {
    const testObj = {
      x: "hello",
    };
    const handler = createWriteHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "SET",
      data: "AAH",
    };
    const result = await handler(message);
    expect(result.ok).toBe(true);
    expect(result.id).toBe(message.id);
    expect(testObj.x).toBe(message.data);
  });
  it("Can Handle Non-Existent Properties", async () => {
    const testObj = {
      x: "hello",
    };
    const handler = createWriteHandler(testObj, "x");
    const message = {
      id: 42,
      name: "nonexistent",
      type: "WRITE",
    };
    expect(handler(message)).toBeUndefined();
  });
  it("Ignores Non Read Messages", async () => {
    const testObj = {
      x: "hello",
    };
    const handler = createWriteHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "HELLO",
    };
    expect(handler(message)).toBeUndefined();
  });
});
describe("createBindableWriteHandler", () => {
  it("Can Handle Null Messages", async () => {
    const testObj = {
      x: property("hello"),
    };
    const handler = createBindableWriteHandler(testObj, "x");
    await handler();
  });
  it("Can Handle WriteMessages", async () => {
    const testObj = {
      x: property("hello"),
    };
    const handler = createBindableWriteHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "SET",
      data: "AAH",
    };
    const result = await handler(message);
    expect(result.ok).toBe(true);
    expect(result.id).toBe(message.id);
    expect(testObj.x.value).toBe(message.data);
  });
  it("Can Handle Non-Existent Properties", async () => {
    const testObj = {
      x: property("hello"),
    };
    const handler = createBindableWriteHandler(testObj, "x");
    const message = {
      id: 42,
      name: "nonexistent",
      type: "WRITE",
    };
    expect(handler(message)).toBeUndefined();
  });
  it("Ignores Non Read Messages", async () => {
    const testObj = {
      x: property("hello"),
    };
    const handler = createBindableWriteHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "HELLO",
    };
    expect(handler(message)).toBeUndefined();
  });
});
describe("CallHandler", () => {
  it("Can Handle Null Messages", async () => {
    const testObj = {
      x: () => {
        return 99;
      },
    };
    const handler = createCallHandler(testObj, "x");
    await handler();
  });
  it("Can Call Functions", async () => {
    const testObj = {
      x: () => {
        return 99;
      },
    };
    const handler = createCallHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "CALL",
    };
    const result = await handler(message);
    expect(result.ok).toBe(true);
    expect(result.id).toBe(message.id);
    expect(result.data).toBe(99);
  });
  it("Can Handle Non-Existent Functions", async () => {
    const testObj = {
      x: () => {},
    };
    const handler = createCallHandler(testObj, "x");
    const message = {
      id: 42,
      name: "nonexistent",
      type: "CALL",
    };
    expect(handler(message)).toBeUndefined();
  });
  it("Ignores Non CALL Messages", async () => {
    const testObj = {
      x: () => {},
    };
    const handler = createCallHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "HELLO",
    };
    expect(handler(message)).toBeUndefined();
  });
  it("Functions returning a Promise", async () => {
    const testObj = {
      x: () => {
        return new Promise((r) => {
          queueMicrotask(() => {
            r(99);
          });
        });
      },
    };
    const handler = createCallHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "CALL",
    };
    const result = await handler(message);
    expect(result.ok).toBe(true);
    expect(result.id).toBe(message.id);
    expect(result.data).toBe(99);
  });
  it("Handles functions throwing exceptions", async () => {
    const testObj = {
      x: () => {
        throw new Error("OH NO!");
      },
    };
    const handler = createCallHandler(testObj, "x");
    const message = {
      id: 42,
      name: "x",
      type: "CALL",
    };
    const result = await handler(message);
    expect(result.ok).toBe(false);
    expect(result.id).toBe(message.id);
    expect(result.data.toString()).toBe("Error: OH NO!");
  });
});
describe("buildMessageHandler", () => {
  it("createMessageHandlers creates Read/Call Handlers", () => {
    class TestClass {
      static properties = {
        hello: PropertyType.Value,
        sayHi: PropertyType.Function,
      };
    }
    let obj = new TestClass();
    const messageHandler = createMessageHandlers(obj, TestClass.properties);

    expect(messageHandler.CALL.length).toBe(1);
    expect(messageHandler.READ.length).toBe(1);
    expect(messageHandler.SET.length).toBe(0);
  });
  it("createMessageHandlers creates Read/Write Handlers", () => {
    class TestClass {
      static properties = {
        hello: PropertyType.Writeables.Value,
      };
    }
    let obj = new TestClass();
    const messageHandler = createMessageHandlers(obj, TestClass.properties);

    expect(messageHandler.CALL.length).toBe(0);
    expect(messageHandler.READ.length).toBe(1);
    expect(messageHandler.SET.length).toBe(1);
  });
  it("createMessageHandlers creates Read/Write for Bindables", () => {
    class TestClass {
      static properties = {
        hello: PropertyType.Bindable,
      };
      hello = property(43);
    }
    let obj = new TestClass();
    const messageHandler = createMessageHandlers(obj, TestClass.properties);

    expect(messageHandler.CALL.length).toBe(0);
    expect(messageHandler.READ.length).toBe(1);
    expect(messageHandler.SET.length).toBe(0);
  });
  it("createMessageHandlers creates Read/Write for Bindables", () => {
    class TestClass {
      static properties = {
        hello: PropertyType.Writeables.Bindable,
      };
      hello = property(43);
    }
    let obj = new TestClass();
    const messageHandler = createMessageHandlers(obj, TestClass.properties);

    expect(messageHandler.CALL.length).toBe(0);
    expect(messageHandler.READ.length).toBe(1);
    expect(messageHandler.SET.length).toBe(1);
  });
});
describe("getResponse", () => {
  it("default arguments cause a throw ", async () => {
    try {
      await getResponse();
    } catch (error) {
      expect(error.toString()).not.toBeUndefined();
    }
  });
  it("calls the appropriate Message Handlers", async () => {
    const testHandler = new MessageHandlerMap();
    testHandler.READ.push((message) => {
      return Promise.resolve(message);
    });
    testHandler.CALL.push((_) => {
      throw new Error("This should not be called!");
    });

    const result = await getResponse(testHandler, {
      id: 99,
      name: "irrelevant",
      type: "READ",
    });
    expect(result.id).toBe(99);
  });
  it("calls *ALL* Message Handlers of a type until it has a result", async () => {
    const testHandler = new MessageHandlerMap();
    let called = 0;
    const fakeHandler = (message) => {
      called++;
      return;
    };
    const realHandler = (message) => {
      fakeHandler();
      return Promise.resolve(message);
    };

    testHandler.READ.push(fakeHandler);
    testHandler.READ.push(fakeHandler);
    testHandler.READ.push(realHandler);

    const result = await getResponse(testHandler, {
      id: 99,
      name: "irrelevant",
      type: "READ",
    });
    expect(result.id).toBe(99);
    // The Promise should have been resolved after the last one sent a result
    expect(called).toBe(testHandler.READ.length);
  });
  it("rejects if the Message type not exists", async () => {
    const testHandler = new MessageHandlerMap();
    try {
      const result = await getResponse(testHandler, {
        id: 99,
        name: "irrelevant",
        type: "LMAOOO",
      });
    } catch (error) {
      expect(error).toBe("Invalid Message Type LMAOOO");
    }
  });
  it("rejects if there is no Message Handler for the existing Type", async () => {
    const testHandler = new MessageHandlerMap();
    try {
      const result = await getResponse(testHandler, {
        id: 99,
        name: "irrelevant",
        type: "CALL",
      });
    } catch (error) {
      expect(error.toString()).toBe(
        "No Message Handler Accepted CALL/irrelevant"
      );
    }
  });
});
describe("requestFromPort", () => {
  it("it Sends the passed ipcmessage", async () => {
    const { port1, port2 } = new MessageChannel();
    const message = {
      ...new IPCMessage(),
      id: 11111,
    };
    const done = new Promise((r) => {
      port2.addEventListener("message", (ev) => {
        r(ev.data);
      });
    });

    requestFromPort(port1, message);

    const outMessage = await done;
    expect(outMessage.id).toBe(message.id);
  });
  it("it resolves on recieving a response", async () => {
    const { port1, port2 } = new MessageChannel();
    const message = {
      ...new IPCMessage(),
      id: 11111,
    };
    const didSend = new Promise((r) => {
      port2.addEventListener("message", (ev) => {
        expect(ev.data.id).toBe(message.id);
        const response = {
          ...ev.data,
          out: "response",
        };
        port2.postMessage(response);
        r(true);
      });
    });
    const response = await requestFromPort(port1, message);
    const didSendData = await didSend;
    expect(didSendData).toBe(true);
    expect(response.id).toBe(message.id);
    expect(response.out).toBe("response");
  });
  it("it rejects after a timeout", async () => {
    const { port1 } = new MessageChannel();
    const message = {
      ...new IPCMessage(),
      id: 11111,
    };
    try {
      const response = await requestFromPort(port1, message, 10);
      expect(false).toBe(true); // Uuh unreachable
    } catch (error) {
      expect(error.toString()).toContain("Timed out while waiting for ");
    }
  });
});

describe("pushBindables", () => {
  it("subscribes and pushes values to the port", async () => {
    class TestClass {
      static properties = {
        hello: PropertyType.Bindable,
      };
      hello = property("hello");
    }
    const testObj = new TestClass();
    const { port1, port2 } = new MessageChannel();

    pushBindables(testObj, TestClass.properties, port1);

    const hasMessage = new Promise((r) => {
      port2.addEventListener("message", (ev) => {
        r(ev.data);
      });
    });

    testObj.hello.set("updated");

    const response = await hasMessage;
    expect(response.data).toBe("updated");
  });
});

describe("createReplicaFunction", () => {
  it("creates a message on call", async () => {
    let was_called = false;
    const testobj = {
      func: () => {
        was_called = true;
      },
    };
    const { port1, port2 } = new MessageChannel();

    const fakeFunc = createReplicaFunction("func", port1);
    const handler = createCallHandler(testobj, "func");
    port2.addEventListener("message", async (e) => {
      const response = await handler(e.data);
      port2.postMessage(response);
    });
    await fakeFunc();
    expect(was_called).toBe(true);
  });
  it("Passes Function results", async () => {
    const testobj = {
      func: () => {
        return 43;
      },
    };
    const { port1, port2 } = new MessageChannel();

    const fakeFunc = createReplicaFunction("func", port1);
    const handler = createCallHandler(testobj, "func");
    port2.addEventListener("message", async (e) => {
      const response = await handler(e.data);
      port2.postMessage(response);
    });
    expect(await fakeFunc()).toBe(43);
  });
});

describe("createReplicaGetter", () => {
  it("creates a message on call", async () => {
    const testobj = {
      hi: 43,
    };
    const { port1, port2 } = new MessageChannel();

    const fakeFunc = createReplicaGetter("hi", port1);
    const handler = createReadHandler(testobj, "hi");
    port2.addEventListener("message", async (e) => {
      const response = await handler(e.data);
      port2.postMessage(response);
    });
    expect(await fakeFunc()).toBe(43);
  });
});

describe("createReplicaSetter", () => {
  it("creates a message on call", async () => {
    const testobj = {
      hi: 43,
    };
    const { port1, port2 } = new MessageChannel();

    const fakeFunc = createReplicaSetter("hi", port1);
    const handler = createWriteHandler(testobj, "hi");
    port2.addEventListener("message", async (e) => {
      const response = await handler(e.data);
      port2.postMessage(response);
    });
    await fakeFunc(999);
    expect(testobj.hi).toBe(999);
  });
});

describe("createReplicaBindable", () => {
  const setup = (port) => {
    class TestClass {
      static properties = {
        hello: PropertyType.Bindable,
      };
      hello = property(43);
    }
    let obj = new TestClass();
    const messageHandler = createMessageHandlers(obj, TestClass.properties);
    pushBindables(obj, TestClass.properties, port);
    return { messageHandler, obj };
  };
  it("creates a message on call", async () => {
    const { port1, port2 } = new MessageChannel();
    const { messageHandler } = setup(port2);
    port2.addEventListener("message", async (e) => {
      const response = await getResponse(messageHandler, e.data);
      port2.postMessage(response);
    });
    const otherReplica = await createReplicaBindable("hello", port1);
    expect(otherReplica.value).toBe(43);
  });
  it("forwards changes", async () => {
    const { port1, port2 } = new MessageChannel();
    const { messageHandler, obj } = setup(port2);
    port2.addEventListener("message", async (e) => {
      const response = await getResponse(messageHandler, e.data);
      port2.postMessage(response);
    });
    const otherReplica = await createReplicaBindable("hello", port1);
    expect(otherReplica.value).toBe(43);
    const possible_subvalues = [69, 43];
    const done = new Promise((r) => {
      otherReplica.subscribe((v) => {
        expect(v).toBe(possible_subvalues.pop());
        if (possible_subvalues.length == 0) {
          r();
        }
      });
    });
    obj.hello.set(69);
    await done;
  });
});
