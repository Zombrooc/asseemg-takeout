"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var format_date_1 = require("../../lib/format-date");
describe("format-date", function () {
    describe("formatDateBR", function () {
        it("returns '—' for null or undefined", function () {
            expect((0, format_date_1.formatDateBR)(null)).toBe("—");
            expect((0, format_date_1.formatDateBR)(undefined)).toBe("—");
        });
        it("formats date in Brazilian format: day de month de year", function () {
            // Use Date(year, monthIndex, day) to avoid timezone-dependent parsing of ISO string
            expect((0, format_date_1.formatDateBR)(new Date(2026, 1, 22))).toBe("22 de fevereiro de 2026");
            expect((0, format_date_1.formatDateBR)(new Date(2026, 0, 15))).toBe("15 de janeiro de 2026");
        });
        it("returns '—' for invalid date string", function () {
            expect((0, format_date_1.formatDateBR)("not-a-date")).toBe("—");
        });
    });
    describe("formatDateTimeBR", function () {
        it("returns '—' for null or undefined", function () {
            expect((0, format_date_1.formatDateTimeBR)(null)).toBe("—");
            expect((0, format_date_1.formatDateTimeBR)(undefined)).toBe("—");
        });
        it("formats date and time in Brazilian format", function () {
            var result = (0, format_date_1.formatDateTimeBR)("2026-02-22T14:30:00.000Z");
            expect(result).toContain("22 de fevereiro de 2026");
            expect(result).toMatch(/\d{1,2}:\d{2}/);
        });
        it("returns '—' for invalid date string", function () {
            expect((0, format_date_1.formatDateTimeBR)("invalid")).toBe("—");
        });
    });
});
