import {
  formatDateBR,
  formatDateOnlyBR,
  formatDateTimeBR,
  normalizeDateOnly,
  parseDateOnlyParts,
} from "../../lib/format-date";

describe("format-date", () => {
  describe("formatDateBR", () => {
    it("returns '—' for null or undefined", () => {
      expect(formatDateBR(null)).toBe("—");
      expect(formatDateBR(undefined)).toBe("—");
    });

    it("formats date in Brazilian format: day de month de year", () => {
      // Use Date(year, monthIndex, day) to avoid timezone-dependent parsing of ISO string
      expect(formatDateBR(new Date(2026, 1, 22))).toBe("22 de fevereiro de 2026");
      expect(formatDateBR(new Date(2026, 0, 15))).toBe("15 de janeiro de 2026");
    });

    it("returns '—' for invalid date string", () => {
      expect(formatDateBR("not-a-date")).toBe("—");
    });

    it("parses calendar dates without timezone or locale ambiguity", () => {
      expect(formatDateBR("2000-03-08")).toBe("8 de mar\u00e7o de 2000");
      expect(formatDateBR("08/03/2000")).toBe("8 de mar\u00e7o de 2000");
    });
  });

  describe("formatDateTimeBR", () => {
    it("returns '—' for null or undefined", () => {
      expect(formatDateTimeBR(null)).toBe("—");
      expect(formatDateTimeBR(undefined)).toBe("—");
    });

    it("formats date and time in Brazilian format", () => {
      const result = formatDateTimeBR("2026-02-22T14:30:00.000Z");
      expect(result).toContain("22 de fevereiro de 2026");
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it("returns '—' for invalid date string", () => {
      expect(formatDateTimeBR("invalid")).toBe("—");
    });
  });

  describe("date-only birth dates", () => {
    it("preserves the calendar date when an API value is an UTC timestamp", () => {
      expect(formatDateOnlyBR("2000-03-08T00:00:00.000Z")).toBe("8 de mar\u00e7o de 2000");
      expect(normalizeDateOnly("2000-03-08T00:00:00.000Z")).toBe("2000-03-08");
    });

    it("does not accept invalid calendar dates", () => {
      expect(parseDateOnlyParts("2000-02-30")).toBeNull();
      expect(formatDateOnlyBR("not-a-date")).toBe("—");
    });

    it("supports Brazilian dates without using the device timezone", () => {
      expect(normalizeDateOnly("08/03/2000")).toBe("2000-03-08");
      expect(formatDateOnlyBR("08/03/2000")).toBe("8 de mar\u00e7o de 2000");
    });
  });
});
