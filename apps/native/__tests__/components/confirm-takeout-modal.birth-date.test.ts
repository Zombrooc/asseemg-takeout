import path from "path";
import { readFileSync } from "fs";

const modalPath = path.resolve(__dirname, "../../components/mobile/audit/confirm-takeout-modal.tsx");
const javascriptModalPath = path.resolve(__dirname, "../../components/mobile/audit/confirm-takeout-modal.js");

describe("ConfirmTakeoutModal birth date", () => {
  it("normalizes API birth date fields before rendering the confirmation rows", () => {
    const source = readFileSync(modalPath, "utf-8");

    expect(source).toContain("participant.birthDate ?? raw.birth_date ?? raw.dataNascimento");
    expect(source).toContain('Row label="Data de nascimento" value={formatBirthDate(birthDate)}');
    expect(source).toContain('Row label="Idade" value={ageFromBirthDate(birthDate)}');

    const javascriptSource = readFileSync(javascriptModalPath, "utf-8");
    expect(javascriptSource).toContain("function getParticipantBirthDate(participant)");
    expect(javascriptSource).toContain("getParticipantBirthDate(participant)");
  });
});
