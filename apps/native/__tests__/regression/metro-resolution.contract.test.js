"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Contract tests: invariants that prevent the Metro resolution bug from recurring.
 * See docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md
 */
var path_1 = require("path");
var fs_1 = require("fs");
var REPO_ROOT = path_1.default.resolve(__dirname, "../../../..");
var NATIVE_ROOT = path_1.default.resolve(REPO_ROOT, "apps/native");
var METRO_CONFIG_PATH = path_1.default.join(NATIVE_ROOT, "metro.config.js");
var NATIVE_PACKAGE_JSON = path_1.default.join(NATIVE_ROOT, "package.json");
var WORKSPACE_YAML = path_1.default.join(REPO_ROOT, "pnpm-workspace.yaml");
var PATCH_PATH = path_1.default.join(REPO_ROOT, "patches/@expo__metro-runtime@6.1.2.patch");
describe("metro-resolution contract (non-regression)", function () {
    it("contract 1: blockList must not block path containing abort-controller/dist/abort-controller", function () {
        var _a, _b;
        expect((0, fs_1.existsSync)(METRO_CONFIG_PATH)).toBe(true);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        var config = require(METRO_CONFIG_PATH);
        var blockList = (_b = (_a = config.resolver) === null || _a === void 0 ? void 0 : _a.blockList) !== null && _b !== void 0 ? _b : [];
        var criticalPath = "node_modules/abort-controller/dist/abort-controller";
        for (var _i = 0, blockList_1 = blockList; _i < blockList_1.length; _i++) {
            var re = blockList_1[_i];
            expect(re.test(criticalPath)).toBe(false);
        }
    });
    it("contract 2: apps/native package.json must include react-native-is-edge-to-edge", function () {
        var _a;
        expect((0, fs_1.existsSync)(NATIVE_PACKAGE_JSON)).toBe(true);
        var pkg = JSON.parse((0, fs_1.readFileSync)(NATIVE_PACKAGE_JSON, "utf-8"));
        expect((_a = pkg.dependencies) === null || _a === void 0 ? void 0 : _a["react-native-is-edge-to-edge"]).toBeDefined();
    });
    it("contract 3: patch file and patchedDependencies entry must exist", function () {
        expect((0, fs_1.existsSync)(PATCH_PATH)).toBe(true);
        expect((0, fs_1.existsSync)(WORKSPACE_YAML)).toBe(true);
        var yaml = (0, fs_1.readFileSync)(WORKSPACE_YAML, "utf-8");
        expect(yaml).toMatch(/patchedDependencies/);
        expect(yaml).toMatch(/@expo__metro-runtime@6\.1\.2/);
        var patchContent = (0, fs_1.readFileSync)(PATCH_PATH, "utf-8");
        expect(patchContent).toMatch(/whatwg-fetch/);
    });
});
