/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class SidebarPopup {
  #port;
  self;
  #resetButton;
  #resetAllButton;
  #currentHostname;
  #serverSelector;
  #excludeCheckbox;
  #clientStatusIndicator;

  async init() {
    self = this;

    const initPort = () => {
      this.#port = browser.runtime.connect({
        name: "sidebar",
      });

      this.#port.onMessage.addListener(async (msg) => {
        if (msg.type === "tabInfo") {
          const {
            currentHostname,
            siteContexts,
            servers,
            currentContext,
            clientState,
          } = msg;
          this.renderUI(
            currentHostname,
            siteContexts,
            servers,
            currentContext,
            clientState
          );
        }
        if (msg.type === "clientStatus") {
          this.renderClientStatusUI(msg.currentClientState);
        }
      });
    };

    initPort();

    this.#resetButton = document.getElementById("removeContext");
    this.#resetAllButton = document.getElementById("resetAll");
    this.#serverSelector = document.getElementById("servers");
    this.#excludeCheckbox = document.getElementById("exclude-origin");
    this.#clientStatusIndicator = document.getElementById(
      "client-status-indicator"
    );

    const handleResetButtonClicks = async () => {
      if (this.#resetButton.disabled) {
        return;
      }
      await self.sendMessage("remove-context", {
        origin: this.#currentHostname,
      });
      self.forceReloadActiveTab();
    };

    const handleServerChanges = async (e) => {
      const selectedServer = e.explicitOriginalTarget.selectedOptions[0];

      await self.sendMessage("add-context", {
        origin: this.#currentHostname,
        countryCode: selectedServer.dataset.countryCode,
        cityName: selectedServer.dataset.cityName,
      });

      self.forceReloadActiveTab();
    };

    const handleCheckboxChanges = async (e) => {
      if (this.#excludeCheckbox.checked) {
        await self.sendMessage("exclude-origin", {
          origin: this.#currentHostname,
        });
      } else {
        await self.sendMessage("remove-context", {
          origin: this.#currentHostname,
        });
      }
      self.forceReloadActiveTab();
    };

    const handleResetAllBtn = async () => {
      await self.sendMessage("reset-all");
    };

    /* Request update from background on tab and window changes */
    browser.windows.onFocusChanged.addListener(() => {
      this.sendMessage("get-tab", {});
    });
    browser.tabs.onUpdated.addListener(() => {
      this.sendMessage("get-tab", {});
    });
    browser.tabs.onActivated.addListener(() => {
      this.sendMessage("get-tab", {});
    });

    /* Add event listeners to UI elements */
    this.#resetButton.removeEventListener("click", handleResetButtonClicks);
    this.#resetButton.addEventListener("click", handleResetButtonClicks);

    this.#resetAllButton.removeEventListener("click", handleResetAllBtn);
    this.#resetAllButton.addEventListener("click", handleResetAllBtn);

    this.#serverSelector.removeEventListener("change", handleServerChanges);
    this.#serverSelector.addEventListener("change", handleServerChanges);

    this.#excludeCheckbox.removeEventListener("change", handleCheckboxChanges);
    this.#excludeCheckbox.addEventListener("change", handleCheckboxChanges);
  }

  async sendMessage(type, data = {}) {
    return this.#port.postMessage({
      type,
      data,
    });
  }

  async renderUI(
    currentHostname,
    siteContexts,
    serverList,
    currentContext,
    clientState
  ) {
    this.#currentHostname = currentHostname;
    this.#clientStatusIndicator.textContent = clientState;
    this.#clientStatusIndicator.dataset.status = clientState;

    // Set origin labels
    document.querySelectorAll(".origin").forEach((el) => {
      el.textContent = currentHostname;
    });

    this.#resetButton.disabled = !currentContext;

    // Site exclusion checkbox...
    this.#excludeCheckbox.checked = currentContext && currentContext.excluded;

    // Server selection dropdown...

    // Don't re-render the server list if already drawn
    if (!self.elemIsAlreadyDrawn(this.#serverSelector)) {
      serverList.forEach((server) => {
        const country = document.createElement("optgroup");
        country.label = server.name;
        server.cities.forEach((city) => {
          const option = document.createElement("option");
          option.value = city.name;
          option.textContent = city.name;
          option.dataset.countryCode = server.code;
          option.dataset.cityName = city.name;

          country.appendChild(option);
        });
        this.#serverSelector.appendChild(country);
      });
    }

    const siteIsExcludedOrHasNoCustomLocation = () => {
      return !currentContext || currentContext.excluded;
    };

    if (siteIsExcludedOrHasNoCustomLocation()) {
      const pickLocationOption = this.#serverSelector.querySelector(
        "[value=pick-location]"
      );
      if (!pickLocationOption) {
        const option = document.createElement("option");
        option.value = "pick-location";
        option.textContent = "Pick a location for this site";
        this.#serverSelector.insertBefore(
          option,
          this.#serverSelector.firstChild
        );
      }
      this.#serverSelector.value = "pick-location";
    } else {
      this.#serverSelector.value = currentContext.cityName;
    }

    // List of sites with special proxy settings...
    const siteContextsList = document.getElementById("siteContextsList");
    this.#resetAllButton.disabled = siteContexts.size == 0;
    if (siteContextsList) {
      if (self.elemIsAlreadyDrawn(siteContextsList)) {
        // Flush previous siteContexts list
        // if we are updating the UI
        self.removeChildren(siteContextsList);
      }
      siteContexts.forEach((site) => {
        const siteEl = document.createElement("li");
        siteEl.textContent = site.origin;
        siteContextsList.appendChild(siteEl);
        siteEl.classList =
          currentContext && site.origin == currentHostname ? ["current"] : [];
      });
    }
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

const popup = new SidebarPopup();
document.addEventListener("DOMContentLoaded", () => {
  popup.init();
});
