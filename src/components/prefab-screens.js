/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, render } from "../vendor/lit-all.min.js";
import { MessageScreen } from "./message-screen.js";
import { tr } from "../shared/i18n.js";
import { onboardingController } from "../ui/browserAction/backend.js";

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
  secondaryAction = tr("getHelp"),
  onSecondaryAction = () => open(sumoLink),
  closeOnClick = true,
  totalPages = 0,
  currentPage = 0
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
      this.secondaryAction = secondaryAction;
      if (closeOnClick) {
        this.onPrimaryAction = function() {
          onPrimaryAction();
          window.close();
        }
        this.onSecondaryAction = function() {
          onSecondaryAction();
          window.close();
        }
      } else {
        this.onPrimaryAction = onPrimaryAction;
        this.onSecondaryAction = onSecondaryAction;
      }
      this.identifier = tag;
      this.totalPages = totalPages;
      this.currentPage = currentPage;
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
);

defineMessageScreen(
  "signin-message-screen",
  "message-signin.svg",
  tr("headerSignedOut"),
  tr("bodySignedOut")
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

const NUMBER_ONBOARDING_SCREENS = 3;
// Need to start loop at 1 because of how the strings were added to l10n repo.
for (let i = 1; i <= NUMBER_ONBOARDING_SCREENS; i++) {
  const isFinalScreen = (i === NUMBER_ONBOARDING_SCREENS);
  defineMessageScreen(
    `onboarding-screen-${i}`,
    `onboarding-${i}.svg`,
    tr(`onboarding${i}_title`),
    html` <p>${tr(`onboarding${i}_body`)}</p> `,
    isFinalScreen ? tr("done") : tr("next"),
    () => {
      isFinalScreen ? onboardingController.finishOnboarding() : onboardingController.nextOnboardingPage();
    },
    isFinalScreen ? tr(" ") : tr("skip"), // For final screen need a space - when using something like `null` there is a large vertical gap
    () => {
      isFinalScreen ? null : onboardingController.finishOnboarding();
    },
    false,
    NUMBER_ONBOARDING_SCREENS,
    i
  );
}

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
