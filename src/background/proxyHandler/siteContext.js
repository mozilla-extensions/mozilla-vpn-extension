/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class SiteContext {
  constructor(context) {
    context ??= {};
    this.origin = context.origin ?? "";
    this.cityName = context.cityName ?? "";
    this.countryCode = context.countryCode ?? "";
    this.excluded = context.excluded ?? false;
    this.proxyInfo = context.proxyInfo ?? [];
  }
}
