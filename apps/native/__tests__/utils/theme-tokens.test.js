"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var theme_tokens_1 = require("@/utils/theme-tokens");
describe("theme-tokens", function () {
    describe("STATUS_PILL_CLASS", function () {
        it("has online and offline variants with static classes", function () {
            expect(theme_tokens_1.STATUS_PILL_CLASS.online).toBe("bg-success/20 border-success");
            expect(theme_tokens_1.STATUS_PILL_CLASS.offline).toBe("bg-danger/20 border-danger");
        });
        it("all keys are valid StatusPillVariant", function () {
            var keys = ["online", "offline"];
            keys.forEach(function (k) {
                expect(theme_tokens_1.STATUS_PILL_CLASS[k]).toBeDefined();
                expect(typeof theme_tokens_1.STATUS_PILL_CLASS[k]).toBe("string");
            });
        });
    });
    describe("CONNECTION_BG_CLASS", function () {
        it("has reachable, unreachable, loading variants", function () {
            expect(theme_tokens_1.CONNECTION_BG_CLASS.reachable).toBe("bg-success/10");
            expect(theme_tokens_1.CONNECTION_BG_CLASS.unreachable).toBe("bg-danger/10");
            expect(theme_tokens_1.CONNECTION_BG_CLASS.loading).toBe("bg-muted/10");
        });
        it("all keys are valid ConnectionBgVariant", function () {
            var keys = ["reachable", "unreachable", "loading"];
            keys.forEach(function (k) {
                expect(theme_tokens_1.CONNECTION_BG_CLASS[k]).toBeDefined();
            });
        });
    });
    describe("BADGE_STATUS_CLASS", function () {
        it("has confirmed, duplicate, failed, pending with static classes", function () {
            expect(theme_tokens_1.BADGE_STATUS_CLASS.confirmed).toContain("success");
            expect(theme_tokens_1.BADGE_STATUS_CLASS.duplicate).toContain("warning");
            expect(theme_tokens_1.BADGE_STATUS_CLASS.failed).toContain("danger");
            expect(theme_tokens_1.BADGE_STATUS_CLASS.pending).toContain("muted");
        });
        it("all keys are valid BadgeStatusVariant", function () {
            var keys = ["confirmed", "duplicate", "failed", "pending"];
            keys.forEach(function (k) {
                expect(theme_tokens_1.BADGE_STATUS_CLASS[k]).toBeDefined();
                expect(typeof theme_tokens_1.BADGE_STATUS_CLASS[k]).toBe("string");
            });
        });
    });
});
