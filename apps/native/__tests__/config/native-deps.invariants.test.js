"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Anti-regression: apps/native must declare deps required by Metro/Expo resolution in pnpm.
 * See docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md
 */
var path_1 = require("path");
var fs_1 = require("fs");
var packageJsonPath = path_1.default.resolve(__dirname, "../../package.json");
describe("native deps invariants", function () {
    it("package.json must include react-native-is-edge-to-edge in dependencies", function () {
        expect((0, fs_1.existsSync)(packageJsonPath)).toBe(true);
        var pkg = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, "utf-8"));
        expect(pkg.dependencies).toBeDefined();
        expect(pkg.dependencies["react-native-is-edge-to-edge"]).toBeDefined();
    });
    it("package.json must include @expo/metro-runtime in dependencies", function () {
        var pkg = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, "utf-8"));
        expect(pkg.dependencies["@expo/metro-runtime"]).toBeDefined();
    });
    it("pnpm-workspace must declare patchedDependencies for @expo/metro-runtime and patch file must exist", function () {
        var workspacePath = path_1.default.resolve(__dirname, "../../../../pnpm-workspace.yaml");
        expect((0, fs_1.existsSync)(workspacePath)).toBe(true);
        var content = (0, fs_1.readFileSync)(workspacePath, "utf-8");
        expect(content).toMatch(/patchedDependencies/);
        expect(content).toMatch(/@expo\/metro-runtime@6\.1\.2/);
        var patchPath = path_1.default.resolve(__dirname, "../../../../patches/@expo__metro-runtime@6.1.2.patch");
        expect((0, fs_1.existsSync)(patchPath)).toBe(true);
    });
});
