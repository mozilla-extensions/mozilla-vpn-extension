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
    Object.freeze(initialvalue);
    Object.seal(initialvalue);
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
    Object.seal(value);
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
 * @template T - Internal Type
 * @template P - Parent Property Type
 *
 * A property consuming another property
 * and applying a transform function
 * before emitting the new value
 *
 */
class LazyComputedProperty {
  /**
   * Constructs a Bindable<T> from a Property
   * @param {WritableProperty<P>} parent - The proptery to read from
   * @param {(arg0: (P|null) )=>T} transform - The function to apply
   */
  constructor(parent, transform) {
    this.#parent = parent;
    this.#transform = transform;
    this.#innerValue = this.#transform(this.#parent.value);
  }

  get value() {
    // If we're currently not subscribed, to the parent
    // create the value on demand
    if (!this.#parentUnsubscribe) {
      return this.#transform(this.#parent.value);
    }
    // Otherwise innerValue is cached correctly
    return this.#innerValue;
  }
  /**
   * Subscribe to changes of the Value
   * @param {(arg0: T)=>void} callback - A callback
   */
  subscribe(callback) {
    if (!this.#parentUnsubscribe) {
      this.#parentUnsubscribe = this.#parent.subscribe((parentValue) => {
        this.#notify(this.#transform(parentValue));
      });
    }
    const unsubscribe = () => {
      this.unsubscribe(callback);
    };
    this.#subscriptions.push(callback);
    return unsubscribe;
  }
  #notify(value) {
    this.#innerValue = value;
    this.#subscriptions.forEach((s) => s(value));
  }
  unsubscribe(callback) {
    this.#subscriptions = this.#subscriptions.filter((t) => t !== callback);
    // Noone listens to us, no need to hook into the parent
    if (this.#subscriptions.length == 0 && this.#parentUnsubscribe) {
      this.#parentUnsubscribe();
      this.#parentUnsubscribe = null;
    }
  }

  /**
   * @type {WritableProperty<P>}
   * The Parent Property
   */
  #parent;
  /** @type { ?Function} */
  #parentUnsubscribe = null;
  /**
   * @type {(arg0: P?)=>T}
   */
  #transform;
  /**
   * @type {Array<(arg0: T)=>void>}
   */
  #subscriptions = [];
  /**
   * @type {T?}
   */
  #innerValue = null;
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
 * @param {WritableProperty<P>} property - Callback when the value changes
 * @param {(arg0: P?)=>T} transform - Called with the Property Value, must return the transformed value
 * @returns {LazyComputedProperty<T,P>} - A Function to stop the subscription
 */
export const computed = (property, transform) => {
  return new LazyComputedProperty(property, transform);
};

/**
 * Creates a "sum-type" property.
 * Takes 2 Properties {L,R} and a function (l,r)=>T
 * When either L or R changes calls the function
 * and updates the returned property.
 *
 *
 * @template T
 * @template L
 * @template R
 * @param {IBindable<L>} left - Left Hand Property
 * @param {IBindable<R>} right - Right Hand Property
 * @param {(arg0: L, arg1: R)=>T} transform - Called with the Property Value, must return the transformed value
 * @returns {ReadOnlyProperty<T>} -
 */
export const propertySum = (left, right, transform) => {
  const inner = property(transform(left.value, right.value));
  left.subscribe((l) => inner.set(transform(l, right.value)));
  right.subscribe((r) => inner.set(transform(left.value, r)));
  return inner.readOnly;
};
