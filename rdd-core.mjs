// rdd-core.mjs
//
// Shared logic for downloading Roblox binaries the way rdd does, minus
// the browser. Supports all four binaryTypes: WindowsPlayer,
// WindowsStudio64, MacPlayer, MacStudio.
//
// Windows types: manifest-assembled (rbxPkgManifest.txt + N package zips,
//   each extracted to a mapped root folder).
// Mac types: NOT manifest-assembled — rdd downloads a single zip directly
//   per arch and hands it straight to the user. We do the same: fetch it
//   and write straight to disk, unmodified.

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { binaryTypes as STATIC_BINARY_TYPES } from "./rdd-studio.static-tables.mjs";

export const HOST_PATH = "https://setup.rbxcdn.com";
export const CLIENTSETTINGS_HOST = "https://clientsettingscdn.roblox.com";

export async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.text();
}

export async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

export function parseArgs(argv) {
  const args = {
    channel: "LIVE",
    out: null,
    binaryType: "WindowsStudio64",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--channel") args.channel = argv[++i];
    else if (a === "--version") args.version = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--binaryType") args.binaryType = argv[++i];
    else if (a === "--arch") args.arch = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
  }
  if (!args.out) args.out = `./${args.binaryType}`;
  return args;
}

export const HELP_TEXT = `Usage:
  node rdd-download.mjs --binaryType <TYPE> [options]

Binary Types:
  * WindowsPlayer
  * WindowsStudio64
  * MacPlayer
  * MacStudio

Options:
  --channel <name>    Deploy channel (default: LIVE)
  --version <hash>    Pin an exact version instead of resolving latest
                       (accepts with or without the "version-" prefix)
  --arch <arch>       Mac only: "arm64" (default) or "x86-64"
  --out <path>        Output directory (default: ./<binaryType>)

Windows types are downloaded and extracted package-by-package (manifest
assembly). Mac types are downloaded as a single pre-built zip, matching
how rdd itself handles them — there's no manifest to assemble for Mac.
`;

/** Normalize a version string the way rdd does: lowercase, "version-" prefixed. */
export function normalizeVersion(version) {
  let v = version.toLowerCase();
  if (!v.startsWith("version-")) v = "version-" + v;
  return v;
}

/** Resolve the current version hash for a channel + binary type via clientsettingscdn. */
export async function resolveVersion(channel, binaryType) {
  const channelNorm =
    channel && channel !== "LIVE" ? channel.toLowerCase() : "LIVE";
  const channelSeg = channelNorm !== "LIVE" ? `/channel/${channelNorm}` : "";
  const primaryUrl = `${CLIENTSETTINGS_HOST}/v2/client-version/${binaryType}/${channelSeg}`;

  try {
    const json = JSON.parse(await fetchText(primaryUrl));
    return json.clientVersionUpload;
  } catch (err) {
    if (!channelSeg) throw err;
    console.warn(
      `  channel-specific lookup failed (${err.message}), falling back to common channel...`,
    );
    const fallbackUrl = `${CLIENTSETTINGS_HOST}/v2/client-version/${binaryType}/channel/common`;
    const json = JSON.parse(await fetchText(fallbackUrl));
    return json.clientVersionUpload;
  }
}

/**
 * Compute channelPath + blobDir + versionPath the same way rdd's
 * fetchManifest() does, including the arch -> blobDir lookup and the
 * channel/common fallback baked into resolveVersion above.
 */
export function buildVersionPath({ channel, binaryTypeConfig, arch, version }) {
  const channelNorm =
    channel && channel !== "LIVE" ? channel.toLowerCase() : "LIVE";
  const channelPath =
    channelNorm === "LIVE" ? HOST_PATH : `${HOST_PATH}/channel/${channelNorm}`;

  const resolvedArch =
    arch ||
    binaryTypeConfig.defaultArch ||
    Object.keys(binaryTypeConfig.blobDirs)[0];
  const blobDir = binaryTypeConfig.blobDirs[resolvedArch];
  if (!blobDir)
    throw new Error(`No blobDir for arch "${resolvedArch}" on this binaryType`);

  return {
    channelPath,
    blobDir,
    versionPath: `${channelPath}${blobDir}${version}-`,
    resolvedArch,
  };
}

// ---- Windows: manifest-assembled path ----

export async function getPackageManifest(
  versionPath,
  channel,
  binaryTypeConfig,
  arch,
  version,
) {
  let url = `${versionPath}rbxPkgManifest.txt`;
  let text;
  try {
    text = await fetchText(url);
  } catch (err) {
    // Same "just try channel/common" fallback rdd's browser code does.
    const fallback = buildVersionPath({
      channel: "common",
      binaryTypeConfig,
      arch,
      version,
    });
    console.warn(
      `  manifest fetch failed on requested channel (${err.message}), retrying on channel/common...`,
    );
    text = await fetchText(`${fallback.versionPath}rbxPkgManifest.txt`);
    versionPath = fallback.versionPath;
  }

  const lines = text.split("\n").map((l) => l.trim());
  if (lines[0] !== "v0") {
    throw new Error(
      `unknown rbxPkgManifest format version; expected "v0", got "${lines[0]}"`,
    );
  }

  const packages = lines.filter((l) => l.endsWith(".zip"));

  // Same category sniff rdd does: presence of RobloxApp.zip vs
  // RobloxStudio.zip in the manifest determines player vs studio, and is
  // cross-checked against the requested binaryType.
  let category;
  if (lines.includes("RobloxApp.zip")) {
    category = "player";
    if (binaryTypeConfig.category !== "player") {
      throw new Error(
        `binaryType expects category "${binaryTypeConfig.category}", but manifest contains "RobloxApp.zip" (player)`,
      );
    }
  } else if (lines.includes("RobloxStudio.zip")) {
    category = "studio";
    if (binaryTypeConfig.category !== "studio") {
      throw new Error(
        `binaryType expects category "${binaryTypeConfig.category}", but manifest contains "RobloxStudio.zip" (studio)`,
      );
    }
  } else {
    throw new Error(
      "bad/unrecognized rbxPkgManifest: no RobloxApp.zip or RobloxStudio.zip entry found",
    );
  }

  return { packages, category, versionPath };
}

async function writeAppSettings(outDir) {
  await writeFile(
    path.join(outDir, "AppSettings.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<Settings>\n\t<ContentFolder>content</ContentFolder>\n\t<BaseUrl>http://www.roblox.com</BaseUrl>\n</Settings>\n`,
  );
}

async function downloadAndExtractPackage(
  versionPath,
  pkgName,
  extractRoot,
  outDir,
) {
  const buf = await fetchBuffer(`${versionPath}${pkgName}`);
  const zip = await JSZip.loadAsync(buf);
  const destRoot = path.join(outDir, extractRoot);
  await mkdir(destRoot, { recursive: true });

  for (const entry of Object.values(zip.files)) {
    // rdd normalizes backslashes in zip entry paths before writing.
    const fixedName = entry.name.replace(/\\/g, "/");
    const destPath = path.join(destRoot, fixedName);
    if (entry.dir) {
      await mkdir(destPath, { recursive: true });
      continue;
    }
    await mkdir(path.dirname(destPath), { recursive: true });
    const content = await entry.async("nodebuffer");
    await writeFile(destPath, content);
  }
}

export async function downloadWindows({
  args,
  extractRootsTable,
  binaryTypeConfig,
}) {
  const outDir = path.resolve(args.out);
  await mkdir(outDir, { recursive: true });

  console.log(`Resolving ${args.binaryType} version...`);
  const version = args.version
    ? normalizeVersion(args.version)
    : await resolveVersion(args.channel, args.binaryType);
  console.log(`  version: ${version}`);

  const { versionPath: initialVersionPath } = buildVersionPath({
    channel: args.channel,
    binaryTypeConfig,
    arch: args.arch,
    version,
  });

  console.log(`Fetching package manifest...`);
  const { packages, category, versionPath } = await getPackageManifest(
    initialVersionPath,
    args.channel,
    binaryTypeConfig,
    args.arch,
    version,
  );
  console.log(`  ${packages.length} packages listed (category: ${category})`);

  const roots = extractRootsTable[category];
  if (!roots)
    throw new Error(`No extract-root table for category "${category}"`);

  for (const pkgName of packages) {
    const extractRoot = roots[pkgName];
    if (extractRoot === undefined) {
      // Matches rdd's own behavior: unknown packages aren't dropped, they
      // get placed at the root of the output so nothing is silently lost.
      console.warn(
        `  ! "${pkgName}" not in extract-root table — placing at output root, same as rdd does for unknown packages`,
      );
      const buf = await fetchBuffer(`${versionPath}${pkgName}`);
      await writeFile(path.join(outDir, pkgName), buf);
      continue;
    }
    console.log(`  -> ${pkgName}  (into ${extractRoot || "."})`);
    await downloadAndExtractPackage(versionPath, pkgName, extractRoot, outDir);
  }

  console.log("Writing AppSettings.xml...");
  await writeAppSettings(outDir);

  const exePath = path.join(
    outDir,
    category === "studio" ? "RobloxStudioBeta.exe" : "RobloxPlayerBeta.exe",
  );
  console.log(`\nDone. Extracted to: ${outDir}`);
  if (existsSync(exePath)) console.log(`Executable: ${exePath}`);
}

// ---- Mac: single direct zip, no manifest ----

export async function downloadMac({ args, binaryTypeConfig }) {
  const outDir = path.resolve(args.out);
  await mkdir(outDir, { recursive: true });

  console.log(`Resolving ${args.binaryType} version...`);
  const version = args.version
    ? normalizeVersion(args.version)
    : await resolveVersion(args.channel, args.binaryType);
  console.log(`  version: ${version}`);

  const { versionPath, resolvedArch } = buildVersionPath({
    channel: args.channel,
    binaryTypeConfig,
    arch: args.arch,
    version,
  });
  console.log(`  arch: ${resolvedArch}`);

  const zipFileName = binaryTypeConfig.zipFileName;
  const url = `${versionPath}${zipFileName}`;
  console.log(`Downloading ${zipFileName}...`);
  const buf = await fetchBuffer(url);

  const outFileName = `${args.channel}-${args.binaryType}-${version}.zip`;
  const outPath = path.join(outDir, outFileName);
  await writeFile(outPath, buf);

  console.log(`\nDone. Saved: ${outPath}`);
  console.log(
    `(Mac builds ship as a single pre-assembled zip — rdd doesn't do package-by-package extraction for these, and neither do we. Unzip it directly.)`,
  );
}

export async function run({ args, extractRootsTable, binaryTypesTable }) {
  const binaryTypeConfig = (binaryTypesTable || STATIC_BINARY_TYPES)[
    args.binaryType
  ];
  if (!binaryTypeConfig) {
    throw new Error(
      `Unknown binaryType "${args.binaryType}". Supported: ${Object.keys(STATIC_BINARY_TYPES).join(", ")}`,
    );
  }

  if (binaryTypeConfig.platform === "mac") {
    await downloadMac({ args, binaryTypeConfig });
  } else {
    await downloadWindows({ args, extractRootsTable, binaryTypeConfig });
  }
}
