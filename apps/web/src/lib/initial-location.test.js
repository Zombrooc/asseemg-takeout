"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var initial_location_1 = require("./initial-location");
(0, vitest_1.describe)("getNormalizedInitialPath", function () {
    (0, vitest_1.it)("normalizes file protocol to root route", function () {
        (0, vitest_1.expect)((0, initial_location_1.getNormalizedInitialPath)({
            protocol: "file:",
            pathname: "/C:/Program Files/ASSEEMG/index.html",
            search: "?foo=1",
            hash: "#bar",
        })).toBe("/?foo=1#bar");
    });
    (0, vitest_1.it)("normalizes /index.html in http(s)", function () {
        (0, vitest_1.expect)((0, initial_location_1.getNormalizedInitialPath)({
            protocol: "https:",
            pathname: "/index.html",
            search: "",
            hash: "",
        })).toBe("/");
    });
    (0, vitest_1.it)("returns null when no normalization is needed", function () {
        (0, vitest_1.expect)((0, initial_location_1.getNormalizedInitialPath)({
            protocol: "https:",
            pathname: "/audit",
            search: "",
            hash: "",
        })).toBeNull();
    });
});
(0, vitest_1.describe)("normalizeInitialLocation", function () {
    (0, vitest_1.it)("calls replaceState with normalized path", function () {
        var replaceState = vitest_1.vi.fn();
        (0, initial_location_1.normalizeInitialLocation)({
            protocol: "https:",
            pathname: "/index.html",
            search: "?token=abc",
            hash: "#section",
        }, replaceState);
        (0, vitest_1.expect)(replaceState).toHaveBeenCalledWith(null, "", "/?token=abc#section");
    });
    (0, vitest_1.it)("does not call replaceState when path is already valid", function () {
        var replaceState = vitest_1.vi.fn();
        (0, initial_location_1.normalizeInitialLocation)({
            protocol: "https:",
            pathname: "/",
            search: "",
            hash: "",
        }, replaceState);
        (0, vitest_1.expect)(replaceState).not.toHaveBeenCalled();
    });
});
