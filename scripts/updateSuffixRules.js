#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = "https://publicsuffix.org/list/effective_tld_names.dat";
const dest = join(__dirname, "../src/shared/suffixes.js");

// Parse line: ignore empty lines and comments, and return the first token
const parseLine = (line) => {
  const trimmed = line.trim();
  return trimmed && !trimmed.startsWith("//") ? trimmed.split(" ")[0] : null;
};

// Process the file and write parsed rules to the destination
async function processFile(src, dest) {
  try {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const text = await response.text();
    const rules = text.split("\n").map(parseLine).filter(Boolean);

    await writeFile(dest, `export default ${JSON.stringify(rules)};`);
    console.log(`Rules successfully written to ${dest}`);
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    process.exit(1);
  }
}

processFile(src, dest);
