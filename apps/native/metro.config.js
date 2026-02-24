const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Passo 1: caminho relativo ao cwd para o transformer do Uniwind bater com filePath (monorepo ou apps/native)
const cssEntryRelative =
  path.relative(process.cwd(), path.join(__dirname, "global.css")) || "global.css";

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: cssEntryRelative,
  dtsFile: path.join(__dirname, "uniwind-types.d.ts"),
});

const reactNativeShimPath = path.resolve(__dirname, "react-native-shim.js");
const originalResolveRequest = uniwindConfig.resolver.resolveRequest;

/** Passo 2: shim para todo import de react-native que não venha de node_modules (app usa uniwind/components). */
uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromNodeModules = context.originModulePath?.includes("node_modules") ?? false;
  if (moduleName === "react-native" && !fromNodeModules) {
    return { type: "sourceFile", filePath: reactNativeShimPath };
  }
  return originalResolveRequest(context, moduleName, platform);
};

// Exclude heavy monorepo dirs from watch/scan. Não bloquear dist (react-native e deps usam .../dist/ como entry)
const blockList = [
  /[\\/]apps[\\/]web[\\/]src-tauri[\\/]target[\\/]/,
  /[\\/]\.turbo[\\/]/,
  /[\\/]\.git[\\/]/,
];
uniwindConfig.resolver.blockList = [...(uniwindConfig.resolver.blockList ?? []), ...blockList];

module.exports = uniwindConfig;
