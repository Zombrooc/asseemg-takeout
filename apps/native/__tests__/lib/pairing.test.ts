import { TakeoutApiError } from "@/lib/takeout-api";
import { getPairingErrorMessage, pairDevice, parsePairingUrl } from "@/lib/pairing";

describe("pairing utilities", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("parsePairingUrl extracts baseUrl and token from valid QR URL", () => {
    expect(parsePairingUrl("http://192.168.0.5:5555?token=ABC123")).toEqual({
      baseUrl: "http://192.168.0.5:5555",
      token: "ABC123",
    });
  });

  it("parsePairingUrl returns null for invalid URL or missing token", () => {
    expect(parsePairingUrl("not-an-url")).toBeNull();
    expect(parsePairingUrl("http://192.168.0.5:5555")).toBeNull();
  });

  it("getPairingErrorMessage extracts backend error from TakeoutApiError body", () => {
    const error = new TakeoutApiError(401, JSON.stringify({ error: "Token inválido" }));
    expect(getPairingErrorMessage(error)).toBe("Token inválido");
  });

  it("getPairingErrorMessage falls back to HTTP status for malformed body", () => {
    const error = new TakeoutApiError(500, "oops");
    expect(getPairingErrorMessage(error)).toBe("Erro 500");
  });

  it("pairDevice throws when pairing response has no access_token", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    await expect(pairDevice("http://192.168.0.5:5555", "ABC123", "dev-1")).rejects.toThrow(
      "Resposta inválida do servidor.",
    );
  });
});
