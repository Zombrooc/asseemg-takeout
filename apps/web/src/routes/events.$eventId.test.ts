import { describe, expect, it } from "vitest";
import type { EventParticipant, LegacyEventParticipant } from "@/lib/takeout-api";
import { resolveDisplayTicket } from "@/components/participants-table";
import { mapLegacyToEventParticipant, normalizeSearchValue, participantMatchesSearch } from "./events.$eventId";

describe("mapLegacyToEventParticipant", () => {
  it("keeps legacy ingresso label as modality only", () => {
    const legacy: LegacyEventParticipant = {
      id: "legacy-1",
      bibNumber: 12,
      name: "Runner Legacy",
      sex: "Feminino",
      cpf: "12345678900",
      birthDate: "2002-05-05",
      modality: "5KM",
      shirtSize: "P",
      team: "Time A",
      checkinDone: false,
    };

    const mapped = mapLegacyToEventParticipant(legacy);
    expect(mapped.sourceTicketId).toBeUndefined();
    expect(resolveDisplayTicket(mapped)).toBe("5KM");
  });
});

describe("participant search helpers", () => {
  const participant: EventParticipant = {
    id: "seat-1",
    name: "João da Silva",
    cpf: "12345678900",
    birthDate: "1990-01-01",
    ticketId: "seat-1",
    sourceTicketId: "orig-5k",
    ticketName: "5KM",
    qrCode: "QR-ABC",
    checkinDone: false,
  };

  it("normalizes accents and casing", () => {
    expect(normalizeSearchValue("  JOÃO ")).toBe("joao");
  });

  it("matches by multiple fields", () => {
    expect(participantMatchesSearch(participant, "joao")).toBe(true);
    expect(participantMatchesSearch(participant, "12345678900")).toBe(true);
    expect(participantMatchesSearch(participant, "5km")).toBe(true);
    expect(participantMatchesSearch(participant, "orig-5k")).toBe(true);
    expect(participantMatchesSearch(participant, "not-found")).toBe(false);
  });
});
