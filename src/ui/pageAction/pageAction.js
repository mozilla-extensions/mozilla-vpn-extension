/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class PageActionPopup {
  #port;
  self;

  async init() { 
    self = this;
    
    this.#port = browser.runtime.connect({
      name: "popup"
    });

    this.#port.onMessage.addListener(async msg => {
      if (msg.type === "tabInfo") {
        const { currentHostname, siteContexts, servers, currentContext } = msg;
        this.renderUI(currentHostname, siteContexts, servers, currentContext);
      }
    });
  }

  async sendMessage(type, data = {}) {
    return this.#port.postMessage({
      type,
      data
    })
  }
  
  async renderUI(currentHostname, siteContexts, serverList, currentContext) {
    console.log("Serverlist", serverList);

    // Set origin labels
    document.querySelectorAll(".origin").forEach(el => {
      el.textContent = currentHostname;
    });


    // Reset button...
    const resetBtn = document.getElementById("removeContext");

    const handleResetButtonClicks = async() => {
      if (resetBtn.disabled) {
        return;
      }
      await self.sendMessage("remove-context", {
        origin: currentHostname
      });
      self.forceReloadActiveTab();
    };

    resetBtn.removeEventListener("click", handleResetButtonClicks);
    resetBtn.addEventListener("click", handleResetButtonClicks);

    resetBtn.disabled = !currentContext;


    // Site exclusion checkbox...
    const checkbox = document.getElementById("exclude-origin");
    checkbox.checked = currentContext && currentContext.excluded;

    const handleCheckboxChanges = async(e) => {
      if (checkbox.checked) {
        await self.sendMessage("exclude-origin", {
          origin: currentHostname
        });
      } else {
        await self.sendMessage("remove-context", {
          origin: currentHostname
        });
      }

      self.forceReloadActiveTab();
    };

    checkbox.removeEventListener("change", handleCheckboxChanges);
    checkbox.addEventListener("change", handleCheckboxChanges);

    
    // Server selection dropdown...
    const serverSelector = document.getElementById("servers");
    
    // Don't re-render the server list if already drawn
    if (!self.elemIsAlreadyDrawn(serverSelector)) {
      serverList.forEach((server) => {
        const country = document.createElement('optgroup');
        country.label = server.name;
        server.cities.forEach((city) => {
          const option = document.createElement('option');
          option.value = city.name;
          option.textContent = city.name;
          option.dataset.countryCode = server.code;
          option.dataset.cityName = city.name;
          
          country.appendChild(option);
        });
        serverSelector.appendChild(country);
      });
    }

    const handleServerChanges = async(e) => {
      const selectedServer = e.explicitOriginalTarget.selectedOptions[0];
      await self.sendMessage("add-context", {
        origin: currentHostname,
        countryCode: selectedServer.dataset.countryCode,
        cityName: selectedServer.dataset.cityName
      });
      
      self.forceReloadActiveTab();
    }

    serverSelector.removeEventListener("change", handleServerChanges);
    serverSelector.addEventListener("change", handleServerChanges);

    const siteIsExcludedOrHasNoCustomLocation = () => {
      return (!currentContext || currentContext.excluded);
    }

    if (siteIsExcludedOrHasNoCustomLocation()) {
      const pickLocationOption = serverSelector.querySelector('[value=pick-location]');
      if (!pickLocationOption) {
        const option = document.createElement('option');
        option.value = "pick-location";
        option.textContent = "Pick a location for this site";
        serverSelector.insertBefore(option, serverSelector.firstChild);
      }
      serverSelector.value = "pick-location";
    } else {
      serverSelector.value = currentContext.cityName;
    }


    // List of sites with special proxy settings...
    const siteContextsList = document.getElementById("siteContextsList");
    if (siteContextsList) {
      if (self.elemIsAlreadyDrawn(siteContextsList)) {
        // Flush previous siteContexts list 
        // if we are updating the UI
        self.removeChildren(siteContextsList);
      }
      siteContexts.forEach(site => {
        const siteEl = document.createElement('li');
        siteEl.textContent = site.origin
        siteContextsList.appendChild(siteEl);
        siteEl.classList = currentContext && (site.origin == currentHostname) ? ["current"] : [];
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
    while(parentEl.firstChild) {
      parentEl.firstChild.remove();
    }
  }
}


const popup = new PageActionPopup();
document.addEventListener("DOMContentLoaded", () => { popup.init() });
