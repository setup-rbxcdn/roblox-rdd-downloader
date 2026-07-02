// index.mjs — library entry point.
//
// Usage:
//   import { download } from "roblox-rdd-downloader"; // or "./rdd/index.mjs"
//   await download({ binaryType: "MacStudio", arch: "arm64", out: "./RobloxStudio" });
//
//   import { downloadLive } from "roblox-rdd-downloader";
//   await downloadLive({ binaryType: "WindowsStudio64", channel: "LIVE" });

import vm from "node:vm";
import {
  run,
  resolveVersion,
  normalizeVersion,
  buildVersionPath,
  getPackageManifest,
  downloadWindows,
  downloadMac,
  fetchText,
  HOST_PATH,
  CLIENTSETTINGS_HOST,
} from "./rdd-core.mjs";
import {
  extractRoots as STATIC_EXTRACT_ROOTS,
  binaryTypes as STATIC_BINARY_TYPES,
} from "./rdd-studio.static-tables.mjs";

const RDD_SOURCE_URL = "https://raw.githubusercontent.com/latte-soft/rdd/master/src/js/rdd.js";

/** Fill in the same defaults parseArgs() applies for CLI use, for a plain options object. */
function normalizeOptions(options = {}) {
  const binaryType = options.binaryType || "WindowsStudio64";
  return {
    channel: options.channel || "LIVE",
    version: options.version,
    binaryType,
    arch: options.arch,
    out: options.out || `./${binaryType}`,
  };
}

/**
 * Download a Roblox binary using the checked-in static extractRoots table.
 * Fast, no dependency on rdd's upstream source being reachable.
 *
 * @param {object} options
 * @param {"WindowsPlayer"|"WindowsStudio64"|"MacPlayer"|"MacStudio"} [options.binaryType="WindowsStudio64"]
 * @param {string} [options.channel="LIVE"]
 * @param {string} [options.version] - pin an exact version hash instead of resolving latest
 * @param {"arm64"|"x86-64"} [options.arch] - Mac only
 * @param {string} [options.out] - output directory, defaults to "./<binaryType>"
 * @returns {Promise<{outDir: string}>}
 */
export async function download(options = {}) {
  const args = normalizeOptions(options);
  await run({ args, extractRootsTable: STATIC_EXTRACT_ROOTS, binaryTypesTable: STATIC_BINARY_TYPES });
  return { outDir: args.out };
}

/**
 * Same as download(), but first tries to pull extractRoots (and, where
 * present, binaryTypes) from latte-soft/rdd's own source at runtime, so
 * it stays in sync automatically if upstream changes the manifest
 * mapping. Falls back to the static table on any fetch/parse failure.
 *
 * @param {object} options - same shape as download()
 * @returns {Promise<{outDir: string, usedLiveTable: boolean}>}
 */
export async function downloadLive(options = {}) {
  const args = normalizeOptions(options);

  let extractRootsTable = STATIC_EXTRACT_ROOTS;
  let binaryTypesTable = STATIC_BINARY_TYPES;
  let usedLiveTable = false;

  try {
    const live = await fetchLiveTables();
    if (!live.extractRoots.player || !live.extractRoots.studio) {
      throw new Error("live table missing player or studio category");
    }
    extractRootsTable = live.extractRoots;
    binaryTypesTable = live.binaryTypes;
    usedLiveTable = true;
  } catch {
    // fall back to static table silently for library use; callers who
    // want the console diagnostics can use rdd-download-live.mjs directly
  }

  await run({ args, extractRootsTable, binaryTypesTable });
  return { outDir: args.out, usedLiveTable };
}

/** Fetch and parse the live extractRoots table from upstream rdd source. Exported for advanced use. */
export async function fetchLiveTables() {
  const src = await fetchText(RDD_SOURCE_URL);

  const extractRootsMatch = src.match(/(?:const|let|var)\s+extractRoots\s*=\s*(\{[\s\S]*?\n\});/);
  if (!extractRootsMatch) throw new Error("could not locate extractRoots object in upstream source");

  const sandbox = {};
  vm.createContext(sandbox);
  const extractRoots = vm.runInContext(`(${extractRootsMatch[1]})`, sandbox, { timeout: 1000 });

  return { extractRoots, binaryTypes: STATIC_BINARY_TYPES };
}

/**
 * Resolve the latest (or channel-pinned) version hash for a binaryType
 * without downloading anything. Useful for checking "is there an update"
 * before committing to a full download.
 *
 * @param {object} options
 * @param {string} [options.binaryType="WindowsStudio64"]
 * @param {string} [options.channel="LIVE"]
 * @returns {Promise<string>} normalized version string, e.g. "version-abcdef1234567890"
 */
export async function getLatestVersion({ binaryType = "WindowsStudio64", channel = "LIVE" } = {}) {
  return resolveVersion(channel, binaryType);
}

// Re-exported for advanced/lower-level use.
export {
  normalizeVersion,
  buildVersionPath,
  getPackageManifest,
  downloadWindows,
  downloadMac,
  STATIC_EXTRACT_ROOTS as extractRoots,
  STATIC_BINARY_TYPES as binaryTypes,
  HOST_PATH,
  CLIENTSETTINGS_HOST,
};
