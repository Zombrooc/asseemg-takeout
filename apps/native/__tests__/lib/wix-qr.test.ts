import { extractWixQrIdentifiers, qrValueMatches } from "@pickup/api/wix-qr";

describe("Wix QR scanner resolution", () => {
  const wixUrl = "https://www.wixevents.com/check-in/30N8-40QJ-DQW1P,2221e781-4179-4ed3-998f-159ce621380a";

  it("resolves the imported ticket number from the scanned URL", () => {
    expect(extractWixQrIdentifiers(wixUrl)?.ticketNumber).toBe("30N8-40QJ-DQW1P");
    expect(qrValueMatches(wixUrl, ["30N8-40QJ-DQW1P"])).toBe(true);
  });

  it("falls back to the order number when the ticket has two suffix characters", () => {
    expect(qrValueMatches(wixUrl, ["30N8-40QJ-DQW"])).toBe(true);
  });
});
