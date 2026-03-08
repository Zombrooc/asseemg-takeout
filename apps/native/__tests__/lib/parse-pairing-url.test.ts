import { parsePairingUrl } from "@/lib/parse-pairing-url";

describe("parsePairingUrl", () => {
  it("parses URL with token in query (?token=)", () => {
    const result = parsePairingUrl("http://192.168.1.10:5555?token=ABC123");
    expect(result).toEqual({ baseUrl: "http://192.168.1.10:5555", token: "ABC123" });
  });

  it("parses URL with token in fragment (#token=)", () => {
    const result = parsePairingUrl("http://192.168.1.10:5555#token=XYZ789");
    expect(result).toEqual({ baseUrl: "http://192.168.1.10:5555", token: "XYZ789" });
  });

  it("parses URL with extra query params and token", () => {
    const result = parsePairingUrl("http://10.0.0.1:5555?foo=bar&token=TOK");
    expect(result).toEqual({ baseUrl: "http://10.0.0.1:5555", token: "TOK" });
  });

  it("normalizes whitespace and newlines", () => {
    const result = parsePairingUrl("  http://192.168.1.10:5555?token=ABC  \n");
    expect(result).toEqual({ baseUrl: "http://192.168.1.10:5555", token: "ABC" });
  });

  it("returns null when token is missing", () => {
    expect(parsePairingUrl("http://192.168.1.10:5555")).toBeNull();
    expect(parsePairingUrl("http://192.168.1.10:5555?foo=bar")).toBeNull();
  });

  it("returns null when URL is invalid", () => {
    expect(parsePairingUrl("not-a-url")).toBeNull();
    expect(parsePairingUrl("")).toBeNull();
  });

  it("returns null when token is empty after trim", () => {
    expect(parsePairingUrl("http://192.168.1.10:5555?token=")).toBeNull();
    expect(parsePairingUrl("http://192.168.1.10:5555?token=   ")).toBeNull();
  });
});
