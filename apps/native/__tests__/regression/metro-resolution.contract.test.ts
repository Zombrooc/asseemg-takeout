/**
 * Contract tests: invariants that prevent the Metro resolution bug from recurring.
 * See docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md
 */
import path from "path";
import { readFileSync, existsSync } from "fs";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const NATIVE_ROOT = path.resolve(REPO_ROOT, "apps/native");
const METRO_CONFIG_PATH = path.join(NATIVE_ROOT, "metro.config.js");
const NATIVE_PACKAGE_JSON = path.join(NATIVE_ROOT, "package.json");
const WORKSPACE_YAML = path.join(REPO_ROOT, "pnpm-workspace.yaml");
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

  it("contract 3: patch file and patchedDependencies entry must exist", () => {
    expect(existsSync(PATCH_PATH)).toBe(true);
    expect(existsSync(WORKSPACE_YAML)).toBe(true);
    const yaml = readFileSync(WORKSPACE_YAML, "utf-8");
    expect(yaml).toMatch(/patchedDependencies/);
    expect(yaml).toMatch(/@expo__metro-runtime@6\.1\.2/);
    const patchContent = readFileSync(PATCH_PATH, "utf-8");
    expect(patchContent).toMatch(/whatwg-fetch/);
  });
});
