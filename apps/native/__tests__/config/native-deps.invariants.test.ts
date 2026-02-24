/**
 * Anti-regression: apps/native must declare deps required by Metro/Expo resolution in pnpm.
 * See docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md
 */
import path from "path";
import { readFileSync, existsSync } from "fs";

const packageJsonPath = path.resolve(__dirname, "../../package.json");

describe("native deps invariants", () => {
  it("package.json must include react-native-is-edge-to-edge in dependencies", () => {
    expect(existsSync(packageJsonPath)).toBe(true);
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies!["react-native-is-edge-to-edge"]).toBeDefined();
  });

  it("package.json must include @expo/metro-runtime in dependencies", () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies!["@expo/metro-runtime"]).toBeDefined();
  });

  it("pnpm-workspace must declare patchedDependencies for @expo/metro-runtime and patch file must exist", () => {
    const workspacePath = path.resolve(__dirname, "../../../../pnpm-workspace.yaml");
    expect(existsSync(workspacePath)).toBe(true);
    const content = readFileSync(workspacePath, "utf-8");
    expect(content).toMatch(/patchedDependencies/);
    expect(content).toMatch(/@expo\/metro-runtime@6\.1\.2/);
    const patchPath = path.resolve(__dirname, "../../../../patches/@expo__metro-runtime@6.1.2.patch");
    expect(existsSync(patchPath)).toBe(true);
  });
});
