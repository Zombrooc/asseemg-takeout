import { describe, expect, it } from "vitest";
import { extractWixQrIdentifiers, getQrLookupValues, qrValueMatches } from "@pickup/api/wix-qr";

describe("Wix QR resolution", () => {
  const wixUrl = "https://www.wixevents.com/check-in/30N8-40QJ-DQW1P,2221e781-4179-4ed3-998f-159ce621380a";

  it("extracts the ticket and derives the order fallback", () => {
    expect(extractWixQrIdentifiers(wixUrl)).toEqual({
      ticketNumber: "30N8-40QJ-DQW1P",
      orderNumber: "30N8-40QJ-DQW",
    });
  });

  it("rejects non-Wix and malformed values", () => {
    expect(extractWixQrIdentifiers("ABC-123")).toBeNull();
    expect(extractWixQrIdentifiers("https://example.com/check-in/ABC-123")).toBeNull();
    expect(extractWixQrIdentifiers("https://www.wixevents.com/other/ABC-123")).toBeNull();
  });

  it("matches ticket first and order fallback second", () => {
    expect(getQrLookupValues(wixUrl)).toEqual(["30n8-40qj-dqw1p", "30n8-40qj-dqw"]);
    expect(qrValueMatches(wixUrl, ["30N8-40QJ-DQW1P"])).toBe(true);
    expect(qrValueMatches(wixUrl, ["30N8-40QJ-DQW"])).toBe(true);
    expect(qrValueMatches(wixUrl, ["other"])).toBe(false);
  });

  it("keeps existing raw QR matching compatible", () => {
    expect(qrValueMatches("qr-ana-12", ["qr-ana-12"])).toBe(true);
    expect(qrValueMatches("qr-ana-12", ["other"])).toBe(false);
  });
});
