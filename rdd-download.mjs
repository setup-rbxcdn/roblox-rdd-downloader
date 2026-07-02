#!/usr/bin/env node
// rdd-download.mjs — uses the static extractRoots table checked into
// rdd-studio.static-tables.mjs. Fast, no dependency on rdd's site being up.
//
// Usage:
//   node rdd-download.mjs --binaryType WindowsStudio64 --channel LIVE --out ./RobloxStudio
//   node rdd-download.mjs --binaryType WindowsPlayer --version 46693bc0bc244907
//   node rdd-download.mjs --binaryType MacStudio --arch arm64
//   node rdd-download.mjs --binaryType MacPlayer --arch x86-64

import { parseArgs, run, HELP_TEXT } from "./rdd-core.mjs";
import { extractRoots } from "./rdd-studio.static-tables.mjs";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(HELP_TEXT);
  process.exit(0);
}

run({ args, extractRootsTable: extractRoots }).catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
