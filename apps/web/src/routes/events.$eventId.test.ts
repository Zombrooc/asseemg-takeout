import { describe, expect, it } from "vitest";
import type { EventParticipant, LegacyEventParticipant } from "@/lib/takeout-api";
import { resolveDisplayTicket } from "@/components/participants-table";
import {
  getParticipantStats,
  getTicketTypeOptions,
  isBirthDateInAllowedRange,
  mapLegacyToEventParticipant,
  normalizeSearchValue,
  participantMatchesSearch,
  resolveInitialTicketType,
} from "./events.$eventId";

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

  it("does not add cpf inconsistency marker in legacy mapping", () => {
    const legacy: LegacyEventParticipant = {
      id: "legacy-2",
      bibNumber: 33,
      name: "Runner Missing CPF",
      sex: "Masculino",
      cpf: "",
      cpfInconsistent: true,
      birthDate: "2001-01-01",
      modality: "10KM",
      shirtSize: "M",
      team: null,
      checkinDone: false,
    };

    const mapped = mapLegacyToEventParticipant(legacy);
    expect(mapped.customFormResponses?.some((r) => r.name === "cpf_inconsistente")).toBe(false);
  });
});

describe("participant search helpers", () => {
  const participant: EventParticipant = {
    id: "seat-1",
    name: "Joao da Silva",
    cpf: "12345678900",
    birthDate: "1990-01-01",
    ticketId: "seat-1",
    sourceTicketId: "orig-5k",
    ticketName: "5KM",
    qrCode: "QR-ABC",
    checkinDone: false,
  };

  it("normalizes accents and casing", () => {
    expect(normalizeSearchValue("  JOAO ")).toBe("joao");
  });

  it("matches by multiple fields", () => {
    expect(participantMatchesSearch(participant, "joao")).toBe(true);
    expect(participantMatchesSearch(participant, "12345678900")).toBe(true);
    expect(participantMatchesSearch(participant, "5km")).toBe(true);
    expect(participantMatchesSearch(participant, "orig-5k")).toBe(true);
    expect(participantMatchesSearch(participant, "not-found")).toBe(false);
  });
});

describe("ticket type helpers", () => {
  const participants: EventParticipant[] = [
    {
      id: "seat-1",
      name: "A",
      cpf: "123",
      birthDate: "1990-01-01",
      ticketId: "seat-1",
      sourceTicketId: "orig-1",
      ticketName: "10KM",
      qrCode: "QR-1",
      checkinDone: true,
    },
    {
      id: "seat-2",
      name: "B",
      cpf: "456",
      birthDate: "1992-02-02",
      ticketId: "seat-2",
      sourceTicketId: "orig-2",
      ticketName: "5KM",
      qrCode: "QR-2",
      checkinDone: false,
    },
    {
      id: "seat-3",
      name: "C",
      cpf: "789",
      birthDate: "1991-03-03",
      ticketId: "seat-3",
      sourceTicketId: "orig-3",
      ticketName: " 5KM ",
      qrCode: "QR-3",
      checkinDone: false,
    },
    {
      id: "seat-4",
      name: "D",
      cpf: "999",
      birthDate: "1991-03-04",
      ticketId: "seat-4",
      sourceTicketId: "orig-4",
      ticketName: null,
      qrCode: "QR-4",
      checkinDone: false,
    },
  ];

  it("builds unique ticket type options from event participants", () => {
    expect(getTicketTypeOptions(participants)).toEqual(["10KM", "5KM"]);
  });

  it("resolves initial ticket type from participant or fallback", () => {
    expect(resolveInitialTicketType(participants[0], ["10KM", "5KM"])).toBe("10KM");
    expect(resolveInitialTicketType(participants[3], ["10KM", "5KM"])).toBe("10KM");
    expect(resolveInitialTicketType(participants[3], [])).toBe("");
  });
});

describe("birth date validation", () => {
  it("accepts only valid ISO dates within configured range", () => {
    expect(isBirthDateInAllowedRange("1990-01-01", "1900-01-01", "2026-03-04")).toBe(true);
    expect(isBirthDateInAllowedRange("1899-12-31", "1900-01-01", "2026-03-04")).toBe(false);
    expect(isBirthDateInAllowedRange("2026-03-05", "1900-01-01", "2026-03-04")).toBe(false);
    expect(isBirthDateInAllowedRange("2026-02-30", "1900-01-01", "2026-03-04")).toBe(false);
    expect(isBirthDateInAllowedRange("03/04/2026", "1900-01-01", "2026-03-04")).toBe(false);
  });
});

describe("participant stats", () => {
  it("computes stats from full event list independent from filtered lists", () => {
    const all: EventParticipant[] = [
      {
        id: "1",
        name: "Joao",
        cpf: "1",
        birthDate: "1990-01-01",
        ticketId: "1",
        sourceTicketId: "a",
        ticketName: "5KM",
        qrCode: "Q1",
        checkinDone: true,
      },
      {
        id: "2",
        name: "Maria",
        cpf: "2",
        birthDate: "1991-01-01",
        ticketId: "2",
        sourceTicketId: "b",
        ticketName: "5KM",
        qrCode: "Q2",
        checkinDone: false,
      },
      {
        id: "3",
        name: "Ana",
        cpf: "3",
        birthDate: "1992-01-01",
        ticketId: "3",
        sourceTicketId: "c",
        ticketName: "10KM",
        qrCode: "Q3",
        checkinDone: true,
      },
    ];

    const filtered = all.filter((p) => p.name === "Maria");

    expect(getParticipantStats(all)).toEqual({ total: 3, confirmed: 2, pending: 1 });
    expect(filtered).toHaveLength(1);
  });
});
