/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-check

import { Component } from "./component.js";
// import { VPNController, VPNState } from "../vpncontroller/index.js";
import { property } from "../shared/property.js";
import { PropertyType } from "./../shared/ipc.js";
import { fromStorage, putIntoStorage } from "./vpncontroller/vpncontroller.js";

const ONBOARDING_KEY = "mozillaVpnOnboarding";
const FIRST_PAGE = 1;
export const NUMBER_OF_ONBOARDING_PAGES = 3;
const FIRST_UNUSED_PAGE = NUMBER_OF_ONBOARDING_PAGES + 1;

/**
 * Handles onboarding.
 *
 */
export class OnboardingController extends Component {
  static properties = {
    nextOnboardingPage: PropertyType.Function,
    finishOnboarding: PropertyType.Function,
    currentOnboardingPage: PropertyType.Bindable,
  };

  /**
   *
   * @param {*} receiver
   */
  constructor(receiver) {
    super(receiver);
    this.#mCurrentOnboardingPage = property(FIRST_PAGE);
  }

  async init() {
    this.#mCurrentOnboardingPage.value = await fromStorage(
      browser.storage.local,
      ONBOARDING_KEY,
      FIRST_PAGE
    );
  }

  get currentOnboardingPage() {
    return this.#mCurrentOnboardingPage.readOnly;
  }

  nextOnboardingPage() {
    this.#mCurrentOnboardingPage.set(this.#mCurrentOnboardingPage.value + 1);
  }

  finishOnboarding() {
    this.#mCurrentOnboardingPage.set(FIRST_UNUSED_PAGE);
    putIntoStorage(FIRST_UNUSED_PAGE, browser.storage.local, ONBOARDING_KEY);
  }

  #mCurrentOnboardingPage = property(FIRST_PAGE);
}
