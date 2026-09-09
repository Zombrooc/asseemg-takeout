"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Anti-regression: Metro blockList must NOT block node_modules paths that contain "dist"
 * (e.g. abort-controller/dist/abort-controller). See docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md
 */
var path_1 = require("path");
var fs_1 = require("fs");
var metroConfigPath = path_1.default.resolve(__dirname, "../../metro.config.js");
describe("metro blockList invariants", function () {
    it("blockList must not block node_modules/abort-controller/dist/abort-controller path", function () {
        var _a, _b;
        expect((0, fs_1.existsSync)(metroConfigPath)).toBe(true);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        var config = require(metroConfigPath);
        var blockList = (_b = (_a = config.resolver) === null || _a === void 0 ? void 0 : _a.blockList) !== null && _b !== void 0 ? _b : [];
        var nodeModulesDistPath = "node_modules/abort-controller/dist/abort-controller";
        var requestStylePath = "abort-controller/dist/abort-controller";
        for (var _i = 0, blockList_1 = blockList; _i < blockList_1.length; _i++) {
            var re = blockList_1[_i];
            expect(re.test(nodeModulesDistPath)).toBe(false);
            expect(re.test(requestStylePath)).toBe(false);
        }
    });
    it("blockList must not contain a regex that blocks any path containing only dist (no node_modules exclusion)", function () {
        var _a, _b;
        // The bug was /[\\/]dist[\\/]/ which matches any path with /dist/ or \dist\
        var config = require(metroConfigPath);
        var blockList = (_b = (_a = config.resolver) === null || _a === void 0 ? void 0 : _a.blockList) !== null && _b !== void 0 ? _b : [];
        var dangerousPattern = /[\\/]dist[\\/]/;
        var hasDangerousDistOnly = blockList.some(function (re) { return re.source === dangerousPattern.source || re.source.includes("dist[\\\\/]"); });
        expect(hasDangerousDistOnly).toBe(false);
    });
    it("if any blockList entry matches dist, it must also require context (e.g. apps/web or target)", function () {
        var _a, _b;
        var config = require(metroConfigPath);
        var blockList = (_b = (_a = config.resolver) === null || _a === void 0 ? void 0 : _a.blockList) !== null && _b !== void 0 ? _b : [];
        var nodeModulesDistPath = "node_modules/whatwg-fetch/dist/fetch.umd.js";
        for (var _i = 0, blockList_2 = blockList; _i < blockList_2.length; _i++) {
            var re = blockList_2[_i];
            expect(re.test(nodeModulesDistPath)).toBe(false);
        }
    });
});
