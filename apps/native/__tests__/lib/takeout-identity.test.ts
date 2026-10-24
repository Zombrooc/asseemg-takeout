import {
  createParticipantEntityKey,
  getTakeoutEntityId,
  parseParticipantEntityKey,
  secureOperationId,
} from "@/lib/takeout-identity";

describe("takeout entity identity", () => {
  it("uses the ticket identity for json_sync participants with multiple tickets", () => {
    const participant = { id: "person-1", ticketId: "ticket-2", qrCode: "qr", name: "Ana", cpf: null, checkinDone: false };
    expect(getTakeoutEntityId(participant, "json_sync")).toBe("ticket-2");
    expect(createParticipantEntityKey("event-1", "json_sync", "ticket-2"))
      .not.toBe(createParticipantEntityKey("event-1", "json_sync", "ticket-1"));
  });

  it("uses participant identity for legacy_csv", () => {
    const participant = { id: "legacy-1", bibNumber: 12, name: "Ana", cpf: "", birthDate: "", checkinDone: false };
    expect(getTakeoutEntityId(participant, "legacy_csv")).toBe("legacy-1");
  });

  it("round trips a scoped key", () => {
    const key = createParticipantEntityKey("event-1", "json_sync", "ticket-1");
    expect(parseParticipantEntityKey(key)).toEqual({ eventId: "event-1", sourceType: "json_sync", entityId: "ticket-1" });
  });

  it("uses the platform cryptographic UUID generator", () => {
    expect(secureOperationId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
