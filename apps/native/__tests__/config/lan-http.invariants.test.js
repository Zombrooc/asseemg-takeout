"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Anti-regression: app.json must allow HTTP (cleartext) for LAN connection to desktop API.
 * Android API 28+ and iOS ATS block HTTP by default; removing this config causes "Network request failed".
 * See docs/incidents/2026-02-24-network-request-failed-lan.md
 */
var path_1 = require("path");
var fs_1 = require("fs");
var appJsonPath = path_1.default.resolve(__dirname, "../../app.json");
function loadAppJson() {
    expect((0, fs_1.existsSync)(appJsonPath)).toBe(true);
    return JSON.parse((0, fs_1.readFileSync)(appJsonPath, "utf-8"));
}
describe("lan-http invariants", function () {
    it("app.json must have expo-build-properties plugin with android.usesCleartextTraffic true", function () {
        var _a, _b, _c;
        var app = loadAppJson();
        expect((_a = app.expo) === null || _a === void 0 ? void 0 : _a.plugins).toBeDefined();
        var plugin = app.expo.plugins.find(function (p) {
            return Array.isArray(p) && p[0] === "expo-build-properties";
        });
        expect(plugin).toBeDefined();
        expect((_c = (_b = plugin[1]) === null || _b === void 0 ? void 0 : _b.android) === null || _c === void 0 ? void 0 : _c.usesCleartextTraffic).toBe(true);
    });
    it("app.json must have ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads true", function () {
        var _a, _b, _c, _d;
        var app = loadAppJson();
        expect((_d = (_c = (_b = (_a = app.expo) === null || _a === void 0 ? void 0 : _a.ios) === null || _b === void 0 ? void 0 : _b.infoPlist) === null || _c === void 0 ? void 0 : _c.NSAppTransportSecurity) === null || _d === void 0 ? void 0 : _d.NSAllowsArbitraryLoads).toBe(true);
    });
    it('app.json must set android.softwareKeyboardLayoutMode to "resize"', function () {
        var _a, _b;
        var app = loadAppJson();
        expect((_b = (_a = app.expo) === null || _a === void 0 ? void 0 : _a.android) === null || _b === void 0 ? void 0 : _b.softwareKeyboardLayoutMode).toBe("resize");
    });
});
