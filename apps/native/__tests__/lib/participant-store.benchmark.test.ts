import { participantStore } from "@/lib/participant-store";
import { createParticipantEntityKey } from "@/lib/takeout-identity";

describe("participant store scalability benchmark", () => {
  it("measures snapshot, indexed search and isolated updates through 20,000 tickets", () => {
    const results: Array<Record<string, number>> = [];
    for (const size of [500, 1_000, 5_000, 10_000, 20_000]) {
      participantStore.resetForTests();
      const participants = Array.from({ length: size }, (_, index) => ({
        id: `participant-${index}`,
        ticketId: `ticket-${index}`,
        name: `Participante ${index}`,
        cpf: String(index).padStart(11, "0"),
        qrCode: `qr-${index}`,
        checkinDone: false,
      }));
      const snapshotStarted = performance.now();
      participantStore.hydrate("benchmark", "json_sync", participants);
      const snapshotMs = performance.now() - snapshotStarted;
      const ids = participantStore.getIds("benchmark", "json_sync");

      const searchStarted = performance.now();
      const found = participantStore.searchIds("benchmark", "json_sync", `qr-${size - 1}`);
      const searchMs = performance.now() - searchStarted;

      const entityKey = createParticipantEntityKey("benchmark", "json_sync", `ticket-${size - 1}`);
      const listener = jest.fn();
      participantStore.subscribeEntity(entityKey, listener);
      const updateStarted = performance.now();
      participantStore.setAuthoritativeCheckin("benchmark", "json_sync", `ticket-${size - 1}`, true, 1);
      const updateMs = performance.now() - updateStarted;

      expect(found).toEqual([entityKey]);
      expect(participantStore.getIds("benchmark", "json_sync")).toBe(ids);
      expect(listener).toHaveBeenCalledTimes(1);
      results.push({ size, snapshotMs, searchMs, updateMs });
    }
    console.info("PARTICIPANT_STORE_BENCHMARK", JSON.stringify(results));
  });
});
