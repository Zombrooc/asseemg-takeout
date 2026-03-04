import { describe, expect, it } from "vitest";
import type { LegacyEventParticipant } from "@/lib/takeout-api";
import { resolveDisplayTicket } from "@/components/participants-table";
import { mapLegacyToEventParticipant } from "./events.$eventId";

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
