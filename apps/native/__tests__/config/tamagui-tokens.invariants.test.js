"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Invariants: Tamagui config must expose V0 semantic tokens for light and dark themes.
 * Required for mobile-tamagui and ui-tamagui components.
 */
var tamagui_config_1 = require("@/tamagui.config");
var REQUIRED_TOKEN_KEYS = [
    "background",
    "foreground",
    "muted",
    "card",
    "border",
    "accent",
    "success",
    "warning",
    "danger",
    "info",
    "overlay",
];
describe("Tamagui config tokens", function () {
    it("exposes light theme with all required semantic tokens", function () {
        var _a;
        var light = (_a = tamagui_config_1.config.themes) === null || _a === void 0 ? void 0 : _a.light;
        expect(light).toBeDefined();
        REQUIRED_TOKEN_KEYS.forEach(function (key) {
            expect(light[key]).toBeDefined();
            var t = typeof light[key];
            expect(["string", "object"].includes(t)).toBe(true);
        });
    });
    it("exposes dark theme with all required semantic tokens", function () {
        var _a;
        var dark = (_a = tamagui_config_1.config.themes) === null || _a === void 0 ? void 0 : _a.dark;
        expect(dark).toBeDefined();
        REQUIRED_TOKEN_KEYS.forEach(function (key) {
            expect(dark[key]).toBeDefined();
            var t = typeof dark[key];
            expect(["string", "object"].includes(t)).toBe(true);
        });
    });
    it("light and dark themes have background defined", function () {
        var _a, _b, _c, _d;
        expect((_b = (_a = tamagui_config_1.config.themes) === null || _a === void 0 ? void 0 : _a.light) === null || _b === void 0 ? void 0 : _b.background).toBeDefined();
        expect((_d = (_c = tamagui_config_1.config.themes) === null || _c === void 0 ? void 0 : _c.dark) === null || _d === void 0 ? void 0 : _d.background).toBeDefined();
    });
});
