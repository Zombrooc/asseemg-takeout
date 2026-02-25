import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("critical CTA testIDs", () => {
  const root = process.cwd();
  const pair = readFileSync(join(root, "app/pair.tsx"), "utf8");
  const home = readFileSync(join(root, "app/(drawer)/index.tsx"), "utf8");
  const event = readFileSync(join(root, "app/(drawer)/events/[eventId].tsx"), "utf8");
  const modal = readFileSync(join(root, "components/takeout/confirm-takeout-modal.tsx"), "utf8");

  it("contains required IDs", () => {
    expect(home).toContain('testID="cta-parear"');
    expect(pair).toContain('testID="cta-conectar"');
    expect(pair).toContain('testID="cta-escanear"');
    expect(modal).toContain('testID="cta-confirmar"');
    expect(event).toContain('testID="cta-reset"');
    expect(home).toContain('testID="cta-desparear"');
  });
});
