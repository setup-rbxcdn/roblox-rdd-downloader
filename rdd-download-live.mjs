#!/usr/bin/env node
// rdd-download-live.mjs — pulls extractRoots (and, where present,
// binaryTypes) from latte-soft/rdd's own source at runtime, so it stays
// in sync automatically if upstream changes the manifest mapping. Falls
// back to the static table on any fetch/parse failure.
//
// Usage is identical to rdd-download.mjs.

import vm from "node:vm";
import { parseArgs, run, HELP_TEXT, fetchText } from "./rdd-core.mjs";
import {
  extractRoots as STATIC_EXTRACT_ROOTS,
  binaryTypes as STATIC_BINARY_TYPES,
} from "./rdd-studio.static-tables.mjs";

const RDD_SOURCE_URL = "https://raw.githubusercontent.com/latte-soft/rdd/master/src/js/rdd.js";

async function fetchLiveTables() {
  const src = await fetchText(RDD_SOURCE_URL);

  const extractRootsMatch = src.match(/(?:const|let|var)\s+extractRoots\s*=\s*(\{[\s\S]*?\n\});/);
  if (!extractRootsMatch) throw new Error("could not locate extractRoots object in upstream source");

  const sandbox = {};
  vm.createContext(sandbox);
  const extractRoots = vm.runInContext(`(${extractRootsMatch[1]})`, sandbox, { timeout: 1000 });

  // binaryTypes in upstream doesn't carry a "category" field (that's our
  // own addition, derived from context) or Mac zipFileName strings in an
  // easily-parseable form — those are inferred inline in fetchManifest's
  // if/else. Rather than duplicate that inference here, we take live
  // extractRoots (the part that actually drifts release to release) and
  // keep our own static binaryTypes/blobDirs table, which changes far
  // less often and isn't worth re-deriving from a regex.
  return { extractRoots, binaryTypes: STATIC_BINARY_TYPES };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP_TEXT);
    return;
  }

  let extractRootsTable = STATIC_EXTRACT_ROOTS;
  let binaryTypesTable = STATIC_BINARY_TYPES;

  try {
    console.log("Fetching live extractRoots table from upstream rdd source...");
    const live = await fetchLiveTables();
    if (!live.extractRoots.player || !live.extractRoots.studio) {
      throw new Error("live table missing player or studio category");
    }
    console.log("  using live table (matches current rdd upstream)");
    extractRootsTable = live.extractRoots;
    binaryTypesTable = live.binaryTypes;
  } catch (err) {
    console.warn(`  live fetch/parse failed (${err.message}); falling back to static table`);
  }

  await run({ args, extractRootsTable, binaryTypesTable });
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
