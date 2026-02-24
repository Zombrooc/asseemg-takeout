/**
 * Anti-regression: Metro blockList must NOT block node_modules paths that contain "dist"
 * (e.g. abort-controller/dist/abort-controller). See docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md
 */
import path from "path";
import { existsSync } from "fs";

const metroConfigPath = path.resolve(__dirname, "../../metro.config.js");

describe("metro blockList invariants", () => {
  it("blockList must not block node_modules/abort-controller/dist/abort-controller path", () => {
    expect(existsSync(metroConfigPath)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(metroConfigPath) as { resolver: { blockList: RegExp[] } };
    const blockList = config.resolver?.blockList ?? [];
    const nodeModulesDistPath = "node_modules/abort-controller/dist/abort-controller";
    const requestStylePath = "abort-controller/dist/abort-controller";
    for (const re of blockList) {
      expect(re.test(nodeModulesDistPath)).toBe(false);
      expect(re.test(requestStylePath)).toBe(false);
    }
  });

  it("blockList must not contain a regex that blocks any path containing only dist (no node_modules exclusion)", () => {
    // The bug was /[\\/]dist[\\/]/ which matches any path with /dist/ or \dist\
    const config = require(metroConfigPath) as { resolver: { blockList: RegExp[] } };
    const blockList = config.resolver?.blockList ?? [];
    const dangerousPattern = /[\\/]dist[\\/]/;
    const hasDangerousDistOnly = blockList.some(
      (re) => re.source === dangerousPattern.source || re.source.includes("dist[\\\\/]")
    );
    expect(hasDangerousDistOnly).toBe(false);
  });

  it("if any blockList entry matches dist, it must also require context (e.g. apps/web or target)", () => {
    const config = require(metroConfigPath) as { resolver: { blockList: RegExp[] } };
    const blockList = config.resolver?.blockList ?? [];
    const nodeModulesDistPath = "node_modules/whatwg-fetch/dist/fetch.umd.js";
    for (const re of blockList) {
      expect(re.test(nodeModulesDistPath)).toBe(false);
    }
  });
});
