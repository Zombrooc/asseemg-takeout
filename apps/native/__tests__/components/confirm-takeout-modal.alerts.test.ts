import path from "path";
import { existsSync, readFileSync } from "fs";

const modalFilePath = path.resolve(
  __dirname,
  "../../components/mobile/audit/confirm-takeout-modal.tsx"
);

function loadModalSource(): string {
  expect(existsSync(modalFilePath)).toBe(true);
  return readFileSync(modalFilePath, "utf-8");
}

describe("confirm-takeout-modal alerts", () => {
  it("keeps alert prop and alert block in modal source", () => {
    const source = loadModalSource();

    expect(source).toContain("alerts?: ParticipantAlert[];");
    expect(source).toContain('testID="takeout-confirm-modal-alerts"');
    expect(source).toContain("Alertas para este participante");
  });

  it("keeps confirmation button gating independent from alerts", () => {
    const source = loadModalSource();

    expect(source).toContain("isDisabled={loading || !canConfirm}");
  });

  it("supports a read-only mode for already confirmed participants", () => {
    const source = loadModalSource();

    expect(source).toContain("readOnly?: boolean;");
    expect(source).toContain('{readOnly ? "Dados do participante" : "Confirmar check-in"}');
    expect(source).toContain("if (readOnly || !participant || !api || !deviceId) return;");
    expect(source).toContain("{!readOnly ? (");
  });
});
