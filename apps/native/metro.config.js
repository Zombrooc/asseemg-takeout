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
const reactNativePath = require.resolve("react-native");
const originalResolveRequest = uniwindConfig.resolver.resolveRequest;

/**
 * Passo 2: shim para imports do app. Imports internos do Uniwind precisam
 * continuar apontando para o React Native real; caso contrário o shim entra
 * em um ciclo: react-native -> uniwind/components -> react-native.
 */
uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const originModulePath = context.originModulePath ?? "";
  const fromNodeModules = originModulePath.includes("node_modules");
  const fromUniwind = originModulePath.includes(`${path.sep}uniwind${path.sep}`);
  const fromShim = originModulePath === reactNativeShimPath;
  if (moduleName === "react-native" && (fromNodeModules || fromUniwind || fromShim)) {
    return { type: "sourceFile", filePath: reactNativePath };
  }
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
