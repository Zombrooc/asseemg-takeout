/**
 * Anti-regression: app.json must allow HTTP (cleartext) for LAN connection to desktop API.
 * Android API 28+ and iOS ATS block HTTP by default; removing this config causes "Network request failed".
 * See docs/incidents/2026-02-24-network-request-failed-lan.md
 */
import path from "path";
import { readFileSync, existsSync } from "fs";

const appJsonPath = path.resolve(__dirname, "../../app.json");

type AppJson = {
  expo?: {
    plugins?: unknown[];
    ios?: { infoPlist?: { NSAppTransportSecurity?: { NSAllowsArbitraryLoads?: boolean } } };
  };
};

function loadAppJson(): AppJson {
  expect(existsSync(appJsonPath)).toBe(true);
  return JSON.parse(readFileSync(appJsonPath, "utf-8")) as AppJson;
}

describe("lan-http invariants", () => {
  it("app.json must have expo-build-properties plugin with android.usesCleartextTraffic true", () => {
    const app = loadAppJson();
    expect(app.expo?.plugins).toBeDefined();
    const plugin = (app.expo!.plugins as unknown[]).find(
      (p): p is [string, { android?: { usesCleartextTraffic?: boolean } }] =>
        Array.isArray(p) && p[0] === "expo-build-properties"
    );
    expect(plugin).toBeDefined();
    expect(plugin![1]?.android?.usesCleartextTraffic).toBe(true);
  });

  it("app.json must have ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads true", () => {
    const app = loadAppJson();
    expect(app.expo?.ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads).toBe(true);
  });
});
