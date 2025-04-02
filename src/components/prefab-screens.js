/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, render } from "../vendor/lit-all.min.js";
import { MessageScreen } from "./message-screen.js";
import { tr } from "../shared/i18n.js";
import {
  onboardingController,
  availabilityService,
} from "../ui/browserAction/backend.js";
import { NUMBER_OF_ONBOARDING_PAGES } from "../background/onboarding.js";

const open = (url) => {
  browser.tabs.create({
    url,
  });
};
const sumoLink =
  "https://support.mozilla.org/products/firefox-private-network-vpn";

const closeAfter = (f) => {
  if (f) {
    f();
  }
  window.close();
};
const sendToApp = (customElement, command = "") => {
  customElement.dispatchEvent(
    new CustomEvent("requestMessage", {
      bubbles: true,
      detail: command,
    })
  );
};

const openVPN = (elm) => {
  sendToApp(elm, "start");
};

const openAuth = (elm) => {
  sendToApp(elm, "focus");
  sendToApp(elm, "openAuth");
};

const defineMessageScreen = (
  args = {
    tag,
    img,
    heading,
    bodyText,
    primaryAction,
    onPrimaryAction,
    secondaryAction: tr("getHelp"),
    onSecondaryAction: () => closeAfter(() => open(sumoLink)),
    totalPages: 0,
    currentPage: 0,
  }
) => {
  const body =
    typeof args.bodyText === "string"
      ? html`<p>${args.bodyText}</p>`
      : args.bodyText;

  class Temp extends MessageScreen {
    connectedCallback() {
      super.connectedCallback();
      this.titleHeader = tr("productName");
      this.img = args.img;
      this.heading = args.heading;
      this.primaryAction = args.primaryAction;
      this.secondaryAction = args.secondaryAction;
      this.onPrimaryAction = args.onPrimaryAction;
      this.onSecondaryAction = args.onSecondaryAction;
      this.identifier = args.tag;
      this.totalPages = args.totalPages;
      this.currentPage = args.currentPage;
      render(body, this);
    }
  }
  customElements.define(args.tag, Temp);
};

const getHelpUrl =
  "https://support.mozilla.org/products/firefox-private-network-vpn/settings/add-ons-extensions-and-themes";

defineMessageScreen({
  tag: "subscribenow-message-screen",
  img: "message-header.svg",
  heading: "Subscribe to Mozilla VPN",
  bodyText: html`
    <p>${tr("bodySubscribeNow2")}</p>
    <p class="footnote">${tr("footerSubscribeNow")}</p>
  `,
  primaryAction: tr("btnSubscribeNow"),
  onPrimaryAction: () =>
    closeAfter(() => open("https://www.mozilla.org/products/vpn#pricing")),
  secondaryAction: tr("getHelp"),
  onSecondaryAction: () => closeAfter(() => open(getHelpUrl)),
});

defineMessageScreen({
  tag: "needs-update-message-screen",
  img: "message-update.svg",
  heading: tr("headerNeedsUpdate"),
  bodyText: tr("bodyNeedsUpdate2"),
  primaryAction: tr("btnDownloadNow"),
  onPrimaryAction: () =>
    closeAfter(() => open("https://www.mozilla.org/products/vpn/download/")),
  secondaryAction: tr("getHelp"),
  onSecondaryAction: () => closeAfter(() => open(getHelpUrl)),
});

defineMessageScreen({
  tag: "signin-message-screen",
  img: "message-signin.svg",
  heading: tr("headerSignedOut"),
  bodyText: tr("bodySignedOut"),
  primaryAction: tr("btnOpenVpn"),
  onPrimaryAction: openAuth,
  secondaryAction: tr("getHelp"),
  onSecondaryAction: () => closeAfter(() => open(getHelpUrl)),
});

defineMessageScreen({
  tag: "install-message-screen",
  img: "message-install.svg",
  heading: tr("headerInstallMsg"),
  bodyText: html`
    <p>${tr("bodyInstallMsg")}</p>
    <p class="footnote">${tr("bodyInstallMsgFooter")}</p>
  `,
  primaryAction: tr("btnDownloadNow"),
  onPrimaryAction: () =>
    closeAfter(() => open("https://www.mozilla.org/products/vpn/download/")),
  secondaryAction: tr("getHelp"),
  onSecondaryAction: () => closeAfter(() => open(getHelpUrl)),
});

defineMessageScreen({
  tag: "open-mozilla-vpn-message-screen",
  img: "message-open.svg",
  heading: tr("headerOpenMozillaVPN"),
  bodyText: html` <p>${tr("bodyOpenMsg")}</p> `,
  onPrimaryAction: openVPN,
  primaryAction: tr("headerOpenMozillaVPN"),
  secondaryAction: tr("getHelp"),
  onSecondaryAction: () => closeAfter(() => open(getHelpUrl)),
});

// Need to start loop at 1 because of how the strings were added to l10n repo.
// We need to stop the looop at NUMBER_OF_ONBOARDING_PAGES-1 -> as we want the Telemetry page to
// be last and it has special logic.
for (let i = 1; i <= NUMBER_OF_ONBOARDING_PAGES; i++) {
  const lastOnboardingPanel = i == NUMBER_OF_ONBOARDING_PAGES;
  const primaryActionText = lastOnboardingPanel ? tr("done") : tr("next");

  defineMessageScreen({
    tag: `onboarding-screen-${i}`,
    img: `onboarding-${i}.svg`,
    heading: tr(`onboarding${i}_title`),
    bodyText: html` <p>${tr(`onboarding${i}_body`)}</p> `,
    primaryAction: primaryActionText,
    onPrimaryAction: () => {
      if (!lastOnboardingPanel) {
        onboardingController.nextOnboardingPage();
      } else {
        onboardingController.finishOnboarding();
      }
    },
    secondaryAction: tr("skip"),
    onSecondaryAction: () => {
      onboardingController.finishOnboarding();
    },
    totalPages: NUMBER_OF_ONBOARDING_PAGES,
    currentPage: i,
  });
}

defineMessageScreen({
  tag: "unsupported-os-message-screen",
  img: "message-os.svg",
  heading: tr("headerUnsupportedOSMessage"),
  bodyText: html`
    <p>${tr("bodyUnsupportedOSMessage")}</p>
    <p class="footnote">${tr("footnoteUnsupportedOSMessage")}</p>
  `,
  onPrimaryAction: null,
  primaryAction: null,
  secondaryAction: tr("getHelp"),
  onSecondaryAction: () => closeAfter(() => open(getHelpUrl)),
});

defineMessageScreen({
  tag: "split-tunnel-message-screen",
  img: "message-split-tunnel.svg",
  heading: tr("messageSplitTunnelHeader"),
  bodyText: tr("messageSplitTunnelBody"),
});
// TODO: ADD STRINGS !!
defineMessageScreen({
  tag: "unsupported-country-message-screen",
  img: "onboarding-2.svg",
  heading: tr("headerSubscriptionNotAvailable"),
  bodyText: html` <p>${tr("bodySubscriptionNotAvailable")}</p> `,
  onPrimaryAction: () =>
    closeAfter(() => open(availabilityService.waitlistURL.value)),
  primaryAction: tr("btnjoinWaitlist"),
  secondaryAction: tr("btnContinue"),
  onSecondaryAction: () => availabilityService.ignore(),
});
