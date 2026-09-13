/**
 * Contract tests: invariants that prevent the Metro resolution bug from recurring.
 * See docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md
 */
import path from "path";
import { readFileSync, existsSync, readdirSync } from "fs";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const NATIVE_ROOT = path.resolve(REPO_ROOT, "apps/native");
const METRO_CONFIG_PATH = path.join(NATIVE_ROOT, "metro.config.js");
const NATIVE_PACKAGE_JSON = path.join(NATIVE_ROOT, "package.json");
const PATCH_PATH = path.join(REPO_ROOT, "patches/@expo__metro-runtime@6.1.2.patch");

describe("metro-resolution contract (non-regression)", () => {
  it("contract 1: blockList must not block path containing abort-controller/dist/abort-controller", () => {
    expect(existsSync(METRO_CONFIG_PATH)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(METRO_CONFIG_PATH) as { resolver: { blockList: RegExp[] } };
    const blockList = config.resolver?.blockList ?? [];
    const criticalPath = "node_modules/abort-controller/dist/abort-controller";
    for (const re of blockList) {
      expect(re.test(criticalPath)).toBe(false);
    }
  });

  it("contract 2: apps/native package.json must include react-native-is-edge-to-edge", () => {
    expect(existsSync(NATIVE_PACKAGE_JSON)).toBe(true);
    const pkg = JSON.parse(readFileSync(NATIVE_PACKAGE_JSON, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["react-native-is-edge-to-edge"]).toBeDefined();
  });

  it("contract 3: obsolete SDK 54 Metro patch must not remain after the SDK upgrade", () => {
    expect(existsSync(PATCH_PATH)).toBe(false);
  });

  it("contract 4: Uniwind internal react-native imports do not resolve back to the shim", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(METRO_CONFIG_PATH) as {
      resolver: { resolveRequest: Function };
    };
    const resolved = config.resolver.resolveRequest(
      { originModulePath: path.join(NATIVE_ROOT, "node_modules/uniwind/src/components/native/View.tsx") },
      "react-native",
      "android",
    ) as { filePath?: string };
    expect(resolved.filePath).not.toBe(path.join(NATIVE_ROOT, "react-native-shim.js"));
    expect(resolved.filePath).toMatch(/[\\/]react-native[\\/]index\.js$/);
  });

  it("contract 5: Expo Router sources must not have compiled JavaScript route duplicates", () => {
    const routeFiles: string[] = [];
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(absolutePath);
        else if (entry.name.endsWith(".js")) routeFiles.push(absolutePath);
      }
    };

    visit(path.join(NATIVE_ROOT, "app"));
    expect(routeFiles).toEqual([]);
  });
});
