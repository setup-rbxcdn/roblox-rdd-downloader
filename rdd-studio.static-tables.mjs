// Transcribed directly from latte-soft/rdd's src/js/rdd.js (MIT license).
// Keep this in sync manually, or use rdd-studio-live.mjs which pulls it
// from upstream at runtime and falls back to this file if that fetch fails.

export const extractRoots = {
  player: {
    "RobloxApp.zip": "",
    "redist.zip": "",
    "shaders.zip": "shaders/",
    "ssl.zip": "ssl/",

    "WebView2.zip": "",
    "WebView2RuntimeInstaller.zip": "WebView2RuntimeInstaller/",

    "content-avatar.zip": "content/avatar/",
    "content-configs.zip": "content/configs/",
    "content-fonts.zip": "content/fonts/",
    "content-sky.zip": "content/sky/",
    "content-sounds.zip": "content/sounds/",
    "content-textures2.zip": "content/textures/",
    "content-models.zip": "content/models/",

    "content-platform-fonts.zip": "PlatformContent/pc/fonts/",
    "content-platform-dictionaries.zip": "PlatformContent/pc/shared_compression_dictionaries/",
    "content-terrain.zip": "PlatformContent/pc/terrain/",
    "content-textures3.zip": "PlatformContent/pc/textures/",

    "extracontent-luapackages.zip": "ExtraContent/LuaPackages/",
    "extracontent-translations.zip": "ExtraContent/translations/",
    "extracontent-models.zip": "ExtraContent/models/",
    "extracontent-textures.zip": "ExtraContent/textures/",
    "extracontent-places.zip": "ExtraContent/places/",
  },

  studio: {
    "RobloxStudio.zip": "",
    "RibbonConfig.zip": "RibbonConfig/",
    "redist.zip": "",
    "Libraries.zip": "",
    "LibrariesQt5.zip": "",

    "WebView2.zip": "",
    "WebView2RuntimeInstaller.zip": "",

    "shaders.zip": "shaders/",
    "ssl.zip": "ssl/",

    "Qml.zip": "Qml/",
    "Plugins.zip": "Plugins/",
    "StudioFonts.zip": "StudioFonts/",
    "BuiltInPlugins.zip": "BuiltInPlugins/",
    "ApplicationConfig.zip": "ApplicationConfig/",
    "BuiltInStandalonePlugins.zip": "BuiltInStandalonePlugins/",

    "content-qt_translations.zip": "content/qt_translations/",
    "content-sky.zip": "content/sky/",
    "content-fonts.zip": "content/fonts/",
    "content-avatar.zip": "content/avatar/",
    "content-models.zip": "content/models/",
    "content-sounds.zip": "content/sounds/",
    "content-configs.zip": "content/configs/",
    "content-api-docs.zip": "content/api_docs/",
    "content-textures2.zip": "content/textures/",
    "content-studio_svg_textures.zip": "content/studio_svg_textures/",

    "content-platform-fonts.zip": "PlatformContent/pc/fonts/",
    "content-platform-dictionaries.zip": "PlatformContent/pc/shared_compression_dictionaries/",
    "content-terrain.zip": "PlatformContent/pc/terrain/",
    "content-textures3.zip": "PlatformContent/pc/textures/",

    "extracontent-translations.zip": "ExtraContent/translations/",
    "extracontent-luapackages.zip": "ExtraContent/LuaPackages/",
    "extracontent-textures.zip": "ExtraContent/textures/",
    "extracontent-scripts.zip": "ExtraContent/scripts/",
    "extracontent-models.zip": "ExtraContent/models/",

    "studiocontent-models.zip": "StudioContent/models/",
    "studiocontent-textures.zip": "StudioContent/textures/",
  },
};

// Windows binary types are manifest-assembled (rbxPkgManifest.txt + N
// package zips). Mac binary types are NOT manifest-assembled — rdd just
// downloads one single zip directly per arch. blobDirs gives the path
// segment (relative to hostPath) each binaryType/arch combo lives under.
export const binaryTypes = {
  WindowsPlayer: {
    platform: "windows",
    category: "player",
    blobDirs: { "x86-64": "/" },
  },
  WindowsStudio64: {
    platform: "windows",
    category: "studio",
    blobDirs: { "x86-64": "/" },
  },
  MacPlayer: {
    platform: "mac",
    zipFileName: "RobloxPlayer.zip",
    defaultArch: "arm64",
    blobDirs: {
      "arm64": "/mac/arm64/",
      "x86-64": "/mac/",
    },
  },
  MacStudio: {
    platform: "mac",
    zipFileName: "RobloxStudioApp.zip",
    defaultArch: "arm64",
    blobDirs: {
      "arm64": "/mac/arm64/",
      "x86-64": "/mac/",
    },
  },
};
