/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "../vendor/lit-all.min.js";

export const settingsButton = () => {
  const openSettingsPage = () => {
    browser.tabs.create({
      url: "/ui/settingsPage/index.html",
    });
  };

  return html`<img
    @click=${openSettingsPage}
    slot="right"
    src="../../assets/img/settings-cog.svg"
  />`;
};
