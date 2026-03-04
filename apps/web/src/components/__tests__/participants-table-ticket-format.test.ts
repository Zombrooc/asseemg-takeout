import { describe, expect, it } from "vitest";
import type { EventParticipant } from "@/lib/takeout-api";
import { resolveDisplayTicket } from "../participants-table";

function buildParticipant(overrides: Partial<EventParticipant>): EventParticipant {
  return {
    id: "p1",
    name: "Runner",
    cpf: "12345678900",
    ticketId: "ticket-1",
    sourceTicketId: "Inteira",
    ticketName: "5KM",
    qrCode: "qr-1",
    checkinDone: false,
    ...overrides,
  };
}

describe("resolveDisplayTicket", () => {
  it("formats json ticket as ingresso + tipo", () => {
    const row = buildParticipant({ sourceTicketId: "Inteira", ticketName: "5KM" });
    expect(resolveDisplayTicket(row)).toBe("Inteira - 5KM");
  });

  it("shows only ticketName for csv when sourceTicketId is missing", () => {
    const row = buildParticipant({ sourceTicketId: undefined, ticketName: "5KM" });
    expect(resolveDisplayTicket(row)).toBe("5KM");
  });

  it("ignores legacy placeholder sourceTicketId when ticketName exists", () => {
    const row = buildParticipant({ sourceTicketId: "#12", ticketName: "5KM" });
    expect(resolveDisplayTicket(row)).toBe("5KM");
  });

  it("falls back to sourceTicketId when ticketName is missing", () => {
    const row = buildParticipant({ ticketName: undefined, sourceTicketId: "Cortesia" });
    expect(resolveDisplayTicket(row)).toBe("Cortesia");
  });

  it("falls back to ticketId when ticketName and sourceTicketId are missing", () => {
    const row = buildParticipant({ ticketName: undefined, sourceTicketId: undefined, ticketId: "ticket-9" });
    expect(resolveDisplayTicket(row)).toBe("ticket-9");
  });
});
