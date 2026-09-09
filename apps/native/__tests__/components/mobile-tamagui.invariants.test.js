"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Invariants: mobile-tamagui constants and contracts (no JSX/RN import to avoid Jest transform issues).
 */
var constants_1 = require("@/components/mobile-tamagui/constants");
describe("mobile-tamagui invariants", function () {
    describe("PAIRING_METHODS", function () {
        it("has qr and manual", function () {
            expect(constants_1.PAIRING_METHODS).toContain("qr");
            expect(constants_1.PAIRING_METHODS).toContain("manual");
            expect(constants_1.PAIRING_METHODS).toHaveLength(2);
        });
        it("PairingMethod type is qr | manual", function () {
            var methods = __spreadArray([], constants_1.PAIRING_METHODS, true);
            expect(methods).toEqual(["qr", "manual"]);
        });
    });
    describe("STATUS_PILL_LABELS", function () {
        it("has live and offline labels", function () {
            expect(constants_1.STATUS_PILL_LABELS.live).toBe("LIVE");
            expect(constants_1.STATUS_PILL_LABELS.offline).toBe("OFFLINE");
        });
    });
});
