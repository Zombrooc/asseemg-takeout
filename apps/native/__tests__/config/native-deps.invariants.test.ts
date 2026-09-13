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

  it("uses the Expo 57 metro runtime declared by the app", () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["@expo/metro-runtime"]).toBe("~57.0.15");
  });
});
