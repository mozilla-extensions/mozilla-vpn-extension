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
const sumoLink =
  "https://support.mozilla.org/products/firefox-private-network-vpn";

const defineMessageScreen = (
  tag,
  img,
  heading,
  bodyText,
  primaryAction,
  onPrimaryAction,
  secondarAction = tr("getHelp"),
  onSecondaryAction = () => open(sumoLink)
) => {
  const body =
    typeof bodyText === "string" ? html`<p>${bodyText}</p>` : bodyText;

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
      this.identifier = tag;
      render(body, this);
    }
  }
  customElements.define(tag, Temp);
};

const sendToApp = (customElement, command = "") => {
  customElement.dispatchEvent(
    new CustomEvent("requestMessage", {
      bubbles: true,
      detail: command,
    })
  );
};

defineMessageScreen(
  "subscribenow-message-screen",
  "message-header.svg",
  "Subscribe to Mozilla VPN",
  tr("bodySubscribeNow"),
  tr("btnSubscribeNow"),
  () => {
    open("https://www.mozilla.org/products/vpn#pricing");
  }
);

defineMessageScreen(
  "needs-update-message-screen",
  "message-update.svg",
  tr("headerNeedsUpdate"),
  tr("bodyNeedsUpdate"),
  tr("btnDownloadNow"),
  () => {
    open("https://www.mozilla.org/products/vpn/download/");
  }
)

defineMessageScreen(
  "signin-message-screen",
  "message-signin.svg",
  tr("headerSignedOut"),
  tr("bodySignedOut"),
  tr("btnOpenVpn"),
  (elm) => {
    sendToApp(elm, "focus");
    sendToApp(elm, "openAuth");
  }
);

defineMessageScreen(
  "install-message-screen",
  "message-install.svg",
  tr("headerInstallMsg"),
  html`
    <p>${tr("bodyInstallMsg")}</p>
    <p class="footnote">${tr("bodyInstallMsgFooter")}</p>
  `,
  tr("btnDownloadNow"),
  () => {
    open("https://www.mozilla.org/products/vpn/download/");
  }
);

defineMessageScreen(
  "open-mozilla-vpn-message-screen",
  "message-open.svg",
  tr("headerOpenMozillaVPN"),
  html` <p>${tr("bodyOpenMsg")}</p> `,
  null,
  null
);

defineMessageScreen(
  "unsupported-os-message-screen",
  "message-os.svg",
  tr("headerUnsupportedOSMessage"),
  html`
    <p>${tr("bodyUnsupportedOSMessage")}</p>
    <p class="footnote">${tr("footnoteUnsupportedOSMessage")}</p>
  `,
  null,
  null
);
