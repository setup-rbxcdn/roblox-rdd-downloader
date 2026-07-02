# roblox-rdd-downloader

Headless Node.js reimplementation of [latte-soft/rdd](https://github.com/latte-soft/rdd)
(MIT licensed), supporting all four of rdd's binary types.

**Scope:** downloads and extracts the official, signed Roblox binaries
directly from Roblox's deployment CDN. Does not patch, modify, or execute
any resulting binary.

Usable two ways: as a **CLI** or as an **importable library** (`download`,
`downloadLive`, `getLatestVersion`, etc. via `index.mjs`).

## Install

**From a local clone:**
```bash
npm install
```

**As a dependency in another project, from GitHub:**
```bash
npm install git+https://github.com/setup-rbxcdn/roblox-rdd-downloader.git
```
or in `package.json`:
```json
"dependencies": {
  "roblox-rdd-downloader": "github:setup-rbxcdn/roblox-rdd-downloader"
}
```
Pin to a branch, tag, or commit for a reproducible install instead of
always tracking the default branch head:
```bash
npm install git+https://github.com/setup-rbxcdn/roblox-rdd-downloader.git#v1.0.0
```

After installing, you can confirm the library export is present:
```bash
node -e "import('roblox-rdd-downloader').then(m => console.log(Object.keys(m)))"
```
You should see `download`, `downloadLive`, `getLatestVersion`, etc. in the
list. If you only see CLI-related output or the import fails, `main`/`exports`
in the installed package's `package.json` isn't pointing at `index.mjs` —
double check the install source.

## Usage — CLI

```bash
# Windows Studio (manifest-assembled)
node rdd-download.mjs --binaryType WindowsStudio64 --channel LIVE --out ./RobloxStudio
node rdd-download.mjs --binaryType WindowsStudio64 --version 46693bc0bc244907

# Windows Player (manifest-assembled)
node rdd-download.mjs --binaryType WindowsPlayer --out ./RobloxPlayer

# Mac Studio / Player (single pre-built zip, no manifest — see below)
node rdd-download.mjs --binaryType MacStudio --arch arm64
node rdd-download.mjs --binaryType MacPlayer --arch x86-64

# Live-synced variant (pulls extractRoots from rdd's own source at
# runtime; falls back to the static table on fetch/parse failure)
node rdd-download-live.mjs --binaryType WindowsStudio64
```

Run `node rdd-download.mjs --help` for the full option list.

If installed as a dependency, the CLI scripts are also exposed as `bin`
entries (`rdd-download`, `rdd-download-live`), so you can run them via
`npx` instead:
```bash
npx rdd-download --binaryType WindowsStudio64
npx rdd-download-live --binaryType MacStudio --arch arm64
```

## Usage — Library

```js
import { download, downloadLive, getLatestVersion } from "roblox-rdd-downloader";
// or, from a local copy without installing as a package:
// import { download, downloadLive, getLatestVersion } from "./index.mjs";

// Fast path — uses the checked-in static extractRoots table.
const { outDir } = await download({
  binaryType: "MacStudio", // "WindowsPlayer" | "WindowsStudio64" | "MacPlayer" | "MacStudio"
  arch: "arm64",            // Mac only; "arm64" (default) or "x86-64"
  channel: "LIVE",          // default: "LIVE"
  out: "./RobloxStudio",    // default: "./<binaryType>"
  // version: "46693bc0bc244907", // optional: pin an exact version instead of resolving latest
});

// Live-synced path — pulls extractRoots from rdd's own source at
// runtime, falls back to the static table on any fetch/parse failure.
const { outDir: liveOutDir, usedLiveTable } = await downloadLive({
  binaryType: "WindowsStudio64",
});

// Just check the latest version hash without downloading anything.
const version = await getLatestVersion({ binaryType: "WindowsStudio64" });
```

All library functions return promises and throw on failure (no
`process.exit` calls), so they're safe to `await` from other code, wrap
in `try/catch`, or use inside larger tools/servers.

Lower-level pieces are also exported for advanced use: `buildVersionPath`,
`getPackageManifest`, `downloadWindows`, `downloadMac`, `normalizeVersion`,
`fetchLiveTables`, plus the raw `extractRoots` / `binaryTypes` tables and
the `HOST_PATH` / `CLIENTSETTINGS_HOST` constants.

## Files

- `index.mjs` — library entry point (`download`, `downloadLive`,
  `getLatestVersion`, and re-exports of the lower-level pieces below).
  This is what makes the package `import`-able instead of CLI-only.
- `package.json` — declares `main`/`exports` (pointing at `index.mjs`)
  and `bin` entries for the CLI scripts.
- `rdd-core.mjs` — shared logic: version resolution, manifest parsing,
  category detection, Windows extraction, Mac direct download.
- `rdd-studio.static-tables.mjs` — `extractRoots` (both categories) and
  `binaryTypes`/`blobDirs`, transcribed from rdd's source.
- `rdd-download.mjs` — CLI entry point using the static table.
- `rdd-download-live.mjs` — CLI entry point that fetches `extractRoots`
  from rdd's own GitHub source at runtime, falling back to the static
  table on failure. (`binaryTypes`/Mac config is kept static either
  way — it changes far less often than the content-package mapping and
  isn't reliably regex-extractable from the same source file.)

## Requirements

- Node.js >= 18 (uses the global `fetch`)
- `jszip` (installed automatically via `npm install`, used for
  extracting Windows package zips)
