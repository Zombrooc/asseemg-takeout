import path from "node:path";
import { readFileSync } from "node:fs";
import {
  getTakeoutModalParticipantDetails,
  type TakeoutModalParticipant,
} from "@/components/mobile/audit/confirm-takeout-modal.data";

const modalPath = path.resolve(__dirname, "../../components/mobile/audit/confirm-takeout-modal.tsx");

describe("confirm-takeout-modal redesign", () => {
  it("keeps ticket identity separate from bib number and preserves optional values", () => {
    const participant: TakeoutModalParticipant = {
      id: "p-1",
      name: "Ana Participante",
      cpf: "000.000.000-00",
      birthDate: "1990-01-01",
      ticketId: "internal-ticket-id",
      sourceTicketId: "ticket-source-id",
      ticketName: "Meia maratona com nome longo",
      shirtSize: null,
      team: null,
      bibNumber: 1234,
      qrCode: "qr-1",
      checkinDone: false,
    };

    expect(getTakeoutModalParticipantDetails(participant, "json_sync")).toEqual({
      name: "Ana Participante",
      cpf: "000.000.000-00",
      ticketType: "Meia maratona com nome longo",
      shirtSize: "-",
      bibNumber: "#1234",
      ticketIdentifier: "ticket-source-id",
      team: "-",
    });
  });

  it("uses legacy modality and bib fields with the same three-card semantics", () => {
    const participant: TakeoutModalParticipant = {
      id: "legacy-1",
      bibNumber: 29,
      name: "Juliana Martins Silva",
      cpf: "000.000.000-00",
      birthDate: "1981-08-15",
      modality: "5KM",
      shirtSize: "M",
      team: null,
      checkinDone: false,
    };

    expect(getTakeoutModalParticipantDetails(participant, "legacy_csv")).toMatchObject({
      ticketType: "5KM",
      shirtSize: "M",
      bibNumber: "#29",
      ticketIdentifier: "-",
    });
  });

  it("contains the approved hierarchy, fixed footer actions, and no removed checkbox", () => {
    const source = readFileSync(modalPath, "utf8");

    expect(source).toContain("Conferência do kit");
    expect(source).toContain("Confira antes de entregar ao participante");
    expect(source).toContain('label="Ingresso"');
    expect(source).toContain('label="Tamanho da camisa"');
    expect(source).toContain('label="Número de peito"');
    expect(source).toContain("Confirmar check-in");
    expect(source).toContain("paddingBottom: Math.max(insets.bottom, 12)");
    expect(source).not.toContain("checkedKit");
    expect(source).not.toContain("Conferi o kit antes da entrega");
  });
});
