/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, render } from "../vendor/lit-all.min.js";
import { MessageScreen } from "./message-screen.js";
import { tr } from "../shared/i18n.js";

const open = (url) => {
  browser.tabs.create({
    url,
  });
};

const defineMessageScreen = (
  tag,
  img,
  heading,
  bodyText,
  primaryAction,
  onPrimaryAction,
  secondarAction = tr("getHelp"),
  onSecondaryAction = () => open("https://support.mozilla.org/products/firefox-private-network-vpn")
) => {
    const body = typeof bodyText === "string" ?
        html`<p>${bodyText}</p>` : 
        bodyText

  class Temp extends MessageScreen {
    connectedCallback() {
      super.connectedCallback();
      this.titleHeader = tr("productName");
      this.img = img;
      this.heading = heading;
      this.primaryAction = primaryAction;
      this.onPrimaryAction = onPrimaryAction;
      this.secondaryAction = secondarAction;
      this.onSecondaryAction = onSecondaryAction;
      render(body, this);
    }
  }
  customElements.define(tag, Temp);
};

defineMessageScreen("subcribenow-message-screen",
  "message-header.svg",
  "Subscribe to Mozilla VPN",
  tr("bodySubscribeNow"),
  tr("btnSubscribeNow"),
  () => open("https://vpn.mozilla.org"),
);


defineMessageScreen("signin-message-screen", 
    "message-signin.svg",
    tr("headerSignedOut"),
    tr("bodySignedOut"),
    tr("btnOpenVpn"),
    () => { console.log("FOCUSSSS")},
)

defineMessageScreen("install-message-screen", 
    "message-signin.svg",
    tr("headerInstallMsg"),
    html`
        <p>${tr("bodyInstallMsg")}</p>
        <p class="footnote">${tr("bodyInstallMsgFooter")}</p>
    `,
    tr("btnDownloadNow"),
    () => { open("https://www.mozilla.org/products/vpn/download/")},
)