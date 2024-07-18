/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement } from "../vendor/lit-all.min.js";

/**
 * A Simple StackView
 *
 * Usage:
 **<stack-view>
 *  <other components/>
 *  <lower/>
 *  <currentComponent/>
 * </stack-view>
 *
 *  Items can be added removed anytime using push(HtmlElement) or pop();
 *
 *  Note:
 *  It will style the child-elements directly manipulating their .style attribures
 *
 *  TIP:
 *  It does determine it's size from it's childs so making sure they are equally sized
 *  avoids wierd jank.
 *
 *
 */
export class StackView extends LitElement {
  static properties = {
    // Elements the Stack contains
    viewStack: { type: Array },
  };

  constructor() {
    super();
    this.viewStack = [];
    this.animationTime = 0.2; // s
  }

  connectedCallback() {
    /**
     * When we connect to the DOM "collect"
     * all children and drop them into our stack
     * so you can initialize the element with
     * <stack-view>
     *  <a/>
     *  <b/>
     * </stack-view>
     */
    this.viewStack = [...this.children];
    this.viewStack.forEach((element) => {
      this.baseStyleElement(element);
      element.remove();
    });
    super.connectedCallback();
    this.styleSelf();
  }

  /**
   * Pushes a new Element on the Top of the Stack
   * @param {HTMLElement} element - The element to push on top of the stack, must be an htmlelement
   */
  async push(element) {
    // Set it to "spawn outside of the box"
    const rect = this.getBoundingClientRect();
    this.baseStyleElement(element);
    element.style.transition = `all 0s`;
    element.style.transform = `translateX(${rect.width}px)`;

    // Mount it into the component and wait to render
    this.viewStack = [...this.viewStack, element];
    this.requestUpdate();
    await this.updateComplete;
    // Now animate it to slide into 0/0
    await new Promise((r) => setTimeout(r, this.animationTime * 1000));
    requestAnimationFrame(() => {
      element.style.transition = `all ${this.animationTime}s`;
      element.style.transform = `translateX(0px)`;
    });
  }

  async pop() {
    const top = this.currentElement;
    const rect = this.getBoundingClientRect();
    top.style.transform = `translateX(${rect.width}px)`;
    // Wait for the popout animation to finish.
    // then we pop out the element and re render with the new top element as top.
    await new Promise((r) => setTimeout(r, this.animationTime * 1000));
    requestAnimationFrame(() => {
      this.requestUpdate();
      top.style.transition = `all 0s`;
    });
    return this.viewStack.pop();
  }

  /** @returns {HTMLElement} */
  get currentElement() {
    const element = this.viewStack.at(-1);
    if (element == null) {
      return null;
    }
    element.style.zIndex = "1";
    return element;
  }
  get #bottomElement() {
    let element = this.viewStack.at(-2);
    if (element == null) {
      return null;
    }
    element ??= document.createElement("p");
    element.style.zIndex = "0";
    return element;
  }

  /** @param {HTMLElement} element */
  baseStyleElement(element) {
    element.style.gridArea = "1 / 1 / span 1 / span 1";
    element.style.transition = `all ${this.animationTime}s`;
    element.style.transform = `translateX(0px)`;
  }
  styleSelf() {
    this.style.display = "grid";
    this.style.overflow = "hidden";
  }

  createRenderRoot() {
    // We do not want a shadow root, as the parent styling propbably should affect the child :)
    return this;
  }

  render() {
    return html` ${this.currentElement} ${this.#bottomElement} `;
  }
}
customElements.define("stack-view", StackView);
