# roblox-rdd-downloader

Headless Node.js reimplementation of [latte-soft/rdd](https://github.com/latte-soft/rdd)
(MIT licensed), supporting all four of rdd's binary types.

**Scope:** downloads and extracts the official, signed Roblox binaries
directly from Roblox's deployment CDN. Does not patch, modify, or execute
any resulting binary.

## Setup

```bash
npm install
```

## Usage

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

## Files

- `rdd-core.mjs` — shared logic: version resolution, manifest parsing,
  category detection, Windows extraction, Mac direct download.
- `rdd-studio.static-tables.mjs` — `extractRoots` (both categories) and
  `binaryTypes`/`blobDirs`, transcribed from rdd's source.
- `rdd-download.mjs` — entry point using the static table.
- `rdd-download-live.mjs` — entry point that fetches `extractRoots` from
  rdd's own GitHub source at runtime, falling back to the static table
  on failure. (`binaryTypes`/Mac config is kept static either way — it
  changes far less often than the content-package mapping and isn't
  reliably regex-extractable from the same source file.)
