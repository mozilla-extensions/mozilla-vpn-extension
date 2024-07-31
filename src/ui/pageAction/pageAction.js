/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class PageActionPopup {
  #port;

  async init() {
    this.#port = browser.runtime.connect({
      name: "pageAction",
    });

    this.#port.onMessage.addListener(async (msg) => {
      if (msg.type === "pageActionInfo") {
        const { currentHostname, currentContext } = msg;
        this.renderUI(currentHostname, currentContext);
      }
    });
  }

  async sendMessage(type, data = {}) {
    return this.#port.postMessage({
      type,
      data,
    });
  }

  async renderUI(currentHostname, currentContext) {
    if (!currentContext) {
      return;
    }
    // Set origin labels
    document.querySelectorAll(".origin").forEach((el) => {
      el.textContent = currentHostname;
    });

    // Reset button...
    const resetBtn = document.getElementById("removeContext");
    const excluded = currentContext.excluded;

    resetBtn.textContent = excluded ? "Turn on" : "Remove custom location";
    resetBtn.classList = excluded ? ["primary"] : ["secondary"];

    const handleResetButtonClicks = async () => {
      if (resetBtn.disabled) {
        return;
      }
      await this.sendMessage("remove-context", {
        origin: currentHostname,
      });
      this.forceReloadActiveTab();
    };

    resetBtn.removeEventListener("click", handleResetButtonClicks);
    resetBtn.addEventListener("click", handleResetButtonClicks);

    const contextDescription = document.getElementById("context-description");
    contextDescription.textContent = excluded
      ? "Protection for this site:"
      : "Location for this site:";

    const contextImg = document.getElementById("context-img");
    const scheme =
      window.matchMedia &&
      !!window.matchMedia("(prefers-color-scheme:dark)").matches
        ? "light"
        : "dark";

    contextImg.src = excluded
      ? `./../../assets/logos/logo-${scheme}-excluded.svg`
      : `./../../assets/flags/${currentContext.countryCode}.png`;

    const contextLocation = document.getElementById("context-location");
    contextLocation.textContent = excluded ? "Off" : currentContext.cityName;
  }

  forceReloadActiveTab() {
    // TODO we'll need to reload any other tabs that are open to the same site
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        browser.tabs.reload(tabs[0].id);
      }
    });
  }

  elemIsAlreadyDrawn(elem) {
    return elem.firstChild;
  }

  removeChildren(parentEl) {
    while (parentEl.firstChild) {
      parentEl.firstChild.remove();
    }
  }
}

const popup = new PageActionPopup();

document.addEventListener("DOMContentLoaded", () => {
  popup.init();
});
