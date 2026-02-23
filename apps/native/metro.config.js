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
  let result = originalResolveRequest(context, moduleName, platform);
  // pnpm: whatwg-fetch (dep of @expo/metro-runtime) may not be hoisted; resolve from monorepo root
  if ((!result || result.type === "empty") && moduleName === "whatwg-fetch") {
    try {
      const rootDir = path.resolve(__dirname, "..", "..");
      const filePath = require.resolve(moduleName, { paths: [rootDir] });
      return { type: "sourceFile", filePath };
    } catch (_) {}
  }
  return result;
};

// Exclude heavy monorepo dirs from watch/scan (target, dist, .turbo, .git)
const blockList = [
  /[\\/]apps[\\/]web[\\/]src-tauri[\\/]target[\\/]/,
  /[\\/]dist[\\/]/,
  /[\\/]\.turbo[\\/]/,
  /[\\/]\.git[\\/]/,
];
uniwindConfig.resolver.blockList = [...(uniwindConfig.resolver.blockList ?? []), ...blockList];

module.exports = uniwindConfig;
