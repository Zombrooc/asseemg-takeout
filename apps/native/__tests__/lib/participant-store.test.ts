import { participantStore } from "@/lib/participant-store";
import { createParticipantEntityKey } from "@/lib/takeout-identity";

const participant = (id: string, ticketId: string, name = id) => ({
  id,
  ticketId,
  name,
  cpf: null,
  qrCode: `qr-${ticketId}`,
  checkinDone: false,
});

describe("participant entity store", () => {
  beforeEach(() => participantStore.resetForTests());

  it("notifies only the changed ticket entity", () => {
    const first = participant("person-1", "ticket-1");
    const second = participant("person-1", "ticket-2");
    participantStore.hydrate("event-1", "json_sync", [first, second]);
    const firstKey = createParticipantEntityKey("event-1", "json_sync", "ticket-1");
    const secondKey = createParticipantEntityKey("event-1", "json_sync", "ticket-2");
    const firstListener = jest.fn();
    const secondListener = jest.fn();
    participantStore.subscribeEntity(firstKey, firstListener);
    participantStore.subscribeEntity(secondKey, secondListener);

    participantStore.setAuthoritativeCheckin("event-1", "json_sync", "ticket-1", true, 10);

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).not.toHaveBeenCalled();
    expect(participantStore.get(secondKey)?.authoritativeCheckin).toBe(false);
  });

  it("keeps list ids referentially stable for entity-only changes", () => {
    participantStore.hydrate("event-1", "json_sync", [participant("person-1", "ticket-1")]);
    const before = participantStore.getIds("event-1", "json_sync");
    participantStore.setSyncStatus("event-1", "json_sync", "ticket-1", "pending", "operation-1");
    expect(participantStore.getIds("event-1", "json_sync")).toBe(before);
  });

  it("ignores obsolete check-in events", () => {
    participantStore.hydrate("event-1", "json_sync", [participant("person-1", "ticket-1")]);
    expect(participantStore.setAuthoritativeCheckin("event-1", "json_sync", "ticket-1", true, 20)).toBe(true);
    expect(participantStore.setAuthoritativeCheckin("event-1", "json_sync", "ticket-1", false, 19)).toBe(false);
    expect(participantStore.get(createParticipantEntityKey("event-1", "json_sync", "ticket-1"))?.authoritativeCheckin).toBe(true);
  });

  it("does not notify for a semantically identical sync status", () => {
    participantStore.hydrate("event-1", "json_sync", [participant("person-1", "ticket-1")]);
    const key = createParticipantEntityKey("event-1", "json_sync", "ticket-1");
    const listener = jest.fn();
    participantStore.subscribeEntity(key, listener);
    participantStore.setSyncStatus("event-1", "json_sync", "ticket-1", "pending", "op-1");
    participantStore.setSyncStatus("event-1", "json_sync", "ticket-1", "pending", "op-1");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify cards when a periodic snapshot is structurally unchanged", () => {
    participantStore.hydrate("event", "json_sync", [participant("p1", "t1", "Ana")]);
    const key = createParticipantEntityKey("event", "json_sync", "t1");
    const listener = jest.fn();
    participantStore.subscribeEntity(key, listener);

    participantStore.hydrate("event", "json_sync", [participant("p1", "t1", "Ana")]);

    expect(listener).not.toHaveBeenCalled();
  });

  it("renews a lock without rerendering the participant", () => {
    participantStore.hydrate("event-1", "json_sync", [participant("person-1", "ticket-1")]);
    const key = createParticipantEntityKey("event-1", "json_sync", "ticket-1");
    const listener = jest.fn();
    participantStore.subscribeEntity(key, listener);
    participantStore.setLock("event-1", "json_sync", "ticket-1", "device-2", Math.floor(Date.now() / 1000) + 30, 10);
    participantStore.setLock("event-1", "json_sync", "ticket-1", "device-2", Math.floor(Date.now() / 1000) + 45, 11);
    expect(listener).toHaveBeenCalledTimes(1);
  });

	it("adds a newly created participant without replacing existing entity snapshots", () => {
		participantStore.hydrate("event", "json_sync", [participant("p1", "t1")]);
		const firstKey = createParticipantEntityKey("event", "json_sync", "t1");
		const secondKey = createParticipantEntityKey("event", "json_sync", "t2");
		const existing = participantStore.get(firstKey);
		participantStore.upsertParticipant("event", "json_sync", participant("p2", "t2"), 7);

		expect(participantStore.getIds("event", "json_sync")).toEqual([firstKey, secondKey]);
		expect(participantStore.get(firstKey)).toBe(existing);
		expect(participantStore.get(secondKey)?.lastSeq).toBe(7);
	});

	it("updates only the edited search entry and republishes list membership", () => {
		participantStore.hydrate("event", "json_sync", [
			participant("p1", "t1", "Ana"),
			participant("p2", "t2", "Bruno"),
		]);
		const before = participantStore.getIds("event", "json_sync");
		const listListener = jest.fn();
		participantStore.subscribeList("event", "json_sync", listListener);

		participantStore.patchParticipant("event", "json_sync", "t1", { name: "Carla" }, 9);

		expect(participantStore.searchIds("event", "json_sync", "Ana")).toEqual([]);
		expect(participantStore.searchIds("event", "json_sync", "Carla")).toEqual([
			createParticipantEntityKey("event", "json_sync", "t1"),
		]);
		expect(participantStore.getIds("event", "json_sync")).not.toBe(before);
		expect(listListener).toHaveBeenCalledTimes(1);
	});
});
