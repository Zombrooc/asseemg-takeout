import { describe, expect, it } from "vitest";
import type { EventParticipant } from "@/lib/takeout-api";
import { buildLegacyParticipantAlertMap } from "@pickup/api/legacy-participant-alerts";

function createParticipant(overrides: Partial<EventParticipant>): EventParticipant {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? "Participante",
    cpf: overrides.cpf ?? "",
    birthDate: overrides.birthDate ?? "1990-01-01",
    ticketId: overrides.ticketId ?? overrides.id ?? "ticket",
    sourceTicketId: overrides.sourceTicketId ?? null,
    ticketName: overrides.ticketName ?? "5KM",
    qrCode: overrides.qrCode ?? overrides.id ?? "qr",
    checkinDone: overrides.checkinDone ?? false,
    bibNumber: overrides.bibNumber ?? null,
    customFormResponses: overrides.customFormResponses,
    shirtSize: overrides.shirtSize,
    team: overrides.team,
  };
}

describe("buildLegacyParticipantAlertMap", () => {
  it("flags duplicate CPF with related bib numbers", () => {
    const participants = [
      createParticipant({ id: "p1", bibNumber: 12, name: "Ana", cpf: "529.982.247-25" }),
      createParticipant({ id: "p2", bibNumber: 18, name: "Bruna", cpf: "52998224725" }),
    ];

    const alerts = buildLegacyParticipantAlertMap(participants);

    expect(alerts.p1?.map((item) => item.message)).toContain(
      "Mesmo CPF em duas inscrições. Também aparece no(s) número(s): #18."
    );
    expect(alerts.p2?.map((item) => item.message)).toContain(
      "Mesmo CPF em duas inscrições. Também aparece no(s) número(s): #12."
    );
  });

  it("flags duplicate name and CPF", () => {
    const participants = [
      createParticipant({ id: "p1", bibNumber: 7, name: "Carlos Lima", cpf: "52998224725" }),
      createParticipant({ id: "p2", bibNumber: 9, name: " Carlos  Lima ", cpf: "529.982.247-25" }),
    ];

    const alerts = buildLegacyParticipantAlertMap(participants);

    expect(alerts.p1?.map((item) => item.code)).toContain("duplicate_name_cpf");
    expect(alerts.p1?.map((item) => item.message)).toContain(
      "Nome e CPF duplicados. Também aparece no(s) número(s): #9."
    );
  });

  it("flags same normalized name with different non-empty CPFs", () => {
    const participants = [
      createParticipant({ id: "p1", bibNumber: 4, name: "João   Silva", cpf: "52998224725" }),
      createParticipant({ id: "p2", bibNumber: 10, name: "joao silva", cpf: "12345678909" }),
      createParticipant({ id: "p3", bibNumber: 20, name: "joao silva", cpf: "" }),
    ];

    const alerts = buildLegacyParticipantAlertMap(participants);

    expect(alerts.p1?.map((item) => item.message)).toContain(
      "Mesmo nome com CPF diferente. Também aparece no(s) número(s): #10, #20."
    );
    expect(alerts.p2?.map((item) => item.message)).toContain(
      "Mesmo nome com CPF diferente. Também aparece no(s) número(s): #4, #20."
    );
    expect(alerts.p3).toBeUndefined();
  });

  it("flags participants missing both CPF and birth date", () => {
    const participants = [
      createParticipant({ id: "p1", bibNumber: 3, cpf: " ", birthDate: " " }),
      createParticipant({ id: "p2", bibNumber: 4, cpf: "", birthDate: "1990-01-01" }),
    ];

    const alerts = buildLegacyParticipantAlertMap(participants);

    expect(alerts.p1?.map((item) => item.message)).toContain("Sem CPF e data de nascimento.");
    expect(alerts.p2).toBeUndefined();
  });

  it("flags invalid CPF values", () => {
    const participants = [
      createParticipant({ id: "p1", bibNumber: 1, name: "Ana", cpf: "111.111.111-11" }),
      createParticipant({ id: "p2", bibNumber: 2, name: "Ana", cpf: "12345678900" }),
      createParticipant({ id: "p3", bibNumber: 3, name: "Bruna", cpf: "529.982.247-25" }),
    ];

    const alerts = buildLegacyParticipantAlertMap(participants);

    expect(alerts.p1?.map((item) => item.message)).toContain("CPF inválido.");
    expect(alerts.p2?.map((item) => item.message)).toContain("CPF inválido.");
    expect(alerts.p3).toBeUndefined();
  });

  it("accumulates multiple alerts for the same participant", () => {
    const participants = [
      createParticipant({ id: "p1", bibNumber: 12, name: "Ana", cpf: "12345678900" }),
      createParticipant({ id: "p2", bibNumber: 18, name: "Ana", cpf: "12345678900" }),
      createParticipant({ id: "p3", bibNumber: 20, name: "Ana", cpf: "52998224725" }),
    ];

    const alerts = buildLegacyParticipantAlertMap(participants);

    expect(alerts.p1?.map((item) => item.code)).toEqual([
      "invalid_cpf",
      "duplicate_cpf",
      "duplicate_name_cpf",
      "duplicate_name_different_cpf",
    ]);
  });
});
