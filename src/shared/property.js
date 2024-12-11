/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

/**
 * IBindable<T>:
 *
 * Represents a possibly changing value.
 * - Changes can be subscribed to using `.subscribe( (newValue) => {})`
 * - Current value can be read using `.value()`
 * @template T
 *
 */
export class IBindable {
  /**
   * Returns the Current value
   * @returns {T}
   */
  get value() {
    throw new Error("not implemented");
  }
  /**
   * Subscribe to changes of the Value
   * @param {(arg0: T)=>void} _ - Callback when the value changes
   * @returns {()=>void} - A Function to stop the subscription
   */
  subscribe(_) {
    throw new Error("not implemented");
  }
}

/**
 * A property similar to Q_Property
 * Holds an internal value that can be modified using `.set(NewValue)`
 * Can be used to do Two Way Bindings
 *
 * A read only Bindable can be created using readOnly()
 *
 * @template T
 */
export class WritableProperty extends IBindable {
  /**
   * Constructs a Property<T> with an initial Value
   * @param {T} initialvalue
   */
  constructor(initialvalue) {
    super();
    this.#innerValue = initialvalue;
  }
  /** @returns {T}  */
  get value() {
    return this.#innerValue;
  }
  /** @param {T} v */
  set value(v) {
    this.set(v);
  }
  /**
   * Sets the new value and notifies callbacks
   * @param {T} value
   */
  set(value) {
    this.#innerValue = value;
    Object.freeze(value);
    // Notify subscribtions
    this.#subscriptions.forEach((s) => s(value));
  }
  /**
   * Returns a bindable for the Property
   * @returns {ReadOnlyProperty<T>}
   */
  get readOnly() {
    return new ReadOnlyProperty(this);
  }

  /**
   *
   * @param {(T)=>void} callback - This callback will be called when the value changes
   * @returns {()=>void} unsubscribe function, this will stop all callbacks
   */
  subscribe(callback) {
    const unsubscribe = () => {
      this.#subscriptions = this.#subscriptions.filter((t) => t !== callback);
    };
    this.#subscriptions.push(callback);
    queueMicrotask(() => callback(this.#innerValue));
    return unsubscribe;
  }
  /**
   * @type {Array<(arg0: T)=>void> }
   */
  #subscriptions = [];
  /**
   * @type {T}
   */
  #innerValue;
}

/**
 * A Read only View of a Property<T>
 * Can be used to do One Way Bindings
 *
 * @template T
 */
export class ReadOnlyProperty extends IBindable {
  /**
   * Constructs a Bindable<T> from a Property
   * @param {IBindable<T>} binding
   */
  constructor(binding) {
    super();
    this.#property = binding;
  }
  get value() {
    return this.#property.value;
  }
  /**
   * Subscribe to changes of the Value
   * @param {(T)=>void} callback - A callback
   */
  subscribe(callback) {
    return this.#property.subscribe(callback);
  }
  /**
   * @type {IBindable<T>}
   */
  #property;
}

/**
 * @template T
 * @param {T} value - Initial value of the Property
 * @returns {WritableProperty<T>} - A Property
 */
export const property = (value) => {
  return new WritableProperty(value);
};

/**
 * @template T
 * @template P
 * @param {IBindable<P>} parent - Callback when the value changes
 * @param {(arg0: P?)=>T} transform - Called with the Property Value, must return the transformed value
 * @returns {ReadOnlyProperty<T>} - A Function to stop the subscription
 */
export const computed = (parent, transform) => {
  const inner = new WritableProperty(transform(parent.value));
  parent.subscribe((value) => {
    inner.set(transform(value));
  });
  return inner.readOnly;
};

/**
 * Creates a "sum-type" property.
 * Takes 2 Properties {L,R} and a function (l,r)=>T
 * When either L or R changes calls the function
 * and updates the returned property.
 *
 * Example:
 *     const prop1 = property("hello");
 *     const prop2 = property(4);
 *     const prop3 = property(true);
 *     propertySum( (value1,value2,value3) => {
 *       expect(value1).toBe(prop1.value)
 *       expect(value2).toBe(prop2.value)
 *       expect(value3).toBe(prop3.value)
 *       return value1+value2+value3;
 *     }, prop1, prop2, prop3);
 *
 * @template T
 * @param {Array<IBindable<any>>} parent - Callback when the value changes
 * @param {(...any)=>T} transform - Called with the Property Value, must return the transformed value
 * @returns {ReadOnlyProperty<T>} - A Function to stop the subscription
 */
export const propertySum = (transform, ...parent) => {
  const getValues = () => {
    return parent.map((p) => p.value);
  };
  const inner = new WritableProperty(transform(...getValues()));
  const onUpdated = () => {
    inner.set(transform(...getValues()));
  };
  parent.forEach((p) => {
    p.subscribe(onUpdated);
  });
  return inner.readOnly;
};
