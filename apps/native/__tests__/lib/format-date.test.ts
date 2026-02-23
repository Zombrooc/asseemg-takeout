import { formatDateBR, formatDateTimeBR } from "../../lib/format-date";

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
});
