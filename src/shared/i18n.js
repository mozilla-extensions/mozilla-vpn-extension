/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Get's a translated message
 * @param {*} id - The Id Of the Message
 * @param  {...any} arg - Substitution arguments
 * @returns The Message translated for the Users Language.
 */
export const tr = (id, ...arg) => {
  try {
    const candidate = browser.i18n.getMessage(id, arg);
    if (!candidate || candidate.length === 0) {
      console.error(`Missing Translation Message for ${id}`);
      return id;
    }
    return candidate;
  } catch (error) {
    return id;
  }
};
