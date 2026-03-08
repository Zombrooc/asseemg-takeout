/**
 * Anti-regression: pair screen must show error and loading in QR flow so user gets feedback.
 */
import path from "path";
import { existsSync, readFileSync } from "fs";

const pairPath = path.resolve(__dirname, "../../app/pair.tsx");

function loadPairSource(): string {
  expect(existsSync(pairPath)).toBe(true);
  return readFileSync(pairPath, "utf-8");
}

describe("pair screen QR flow invariants", () => {
  it("QR branch must render error when error is set", () => {
    const source = loadPairSource();
    expect(source).toContain("error ?");
    expect(source).toContain("color: \"#dc2626\"");
    expect(source).toMatch(/error\s*\?\s*\(/);
  });

  it("QR branch must show loading state (Conectando... or disabled button)", () => {
    const source = loadPairSource();
    expect(source).toContain("Conectando...");
    expect(source).toContain("disabled={!operatorFilled || loading}");
  });
});
