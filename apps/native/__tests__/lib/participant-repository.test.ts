const runAsync = jest.fn(async () => ({ changes: 1 }));
const getFirstAsync = jest.fn();
const getAllAsync = jest.fn();
const transaction = jest.fn(
	async (callback: (tx: unknown) => Promise<void>) => {
		await callback({ runAsync, getFirstAsync, getAllAsync });
	},
);

jest.mock("@/lib/storage/takeout-database", () => ({
	getTakeoutDatabase: async () => ({ getFirstAsync, getAllAsync }),
	withTakeoutWriteTransaction: transaction,
}));

import {
	completeRealtimeSync,
	persistParticipantSnapshot,
	persistRealtimeEvent,
} from "@/lib/storage/participant-repository";

describe("participant realtime persistence", () => {
	beforeEach(() => {
		runAsync.mockClear();
		getFirstAsync.mockReset();
		getAllAsync.mockReset();
		transaction.mockClear();
	});

	it("does not overwrite events committed while an HTTP snapshot was downloading", async () => {
		getAllAsync.mockResolvedValueOnce([{ entity_id: "removed-ticket" }]);

		await persistParticipantSnapshot(
			"event-1",
			"json_sync",
			[
				{
					id: "participant-1",
					ticketId: "ticket-1",
					name: "Snapshot",
					cpf: null,
					qrCode: "qr-ticket-1",
					checkinDone: false,
				},
			],
			12,
		);

		const calls = runAsync.mock.calls as unknown[][];
		const upsert = calls.find(([sql]) =>
			String(sql).includes("INSERT INTO participant_entities"),
		);
		const deletion = calls.find(([sql]) =>
			String(sql).includes("DELETE FROM participant_entities"),
		);
		expect(upsert?.[0]).toContain("participant_entities.last_seq<=?");
		expect(upsert?.at(-1)).toBe(12);
		expect(deletion?.at(-1)).toBe(12);
	});

	it("deduplicates an event already committed with its cursor", async () => {
		getFirstAsync.mockResolvedValueOnce({
			server_instance_id: "server-a",
			last_seq: 11,
		});

		await expect(
			persistRealtimeEvent(
				{
					type: "participant_checked_in",
					event_id: "event-1",
					ticket_id: "ticket-1",
					seq: 11,
				},
				"server-a",
			),
		).resolves.toBe(false);
		expect(runAsync).not.toHaveBeenCalled();
	});

	it("resets per-entity versions when the authoritative database instance changes", async () => {
		getFirstAsync.mockResolvedValueOnce({
			server_instance_id: "server-old",
			last_seq: 90,
		});

		await persistRealtimeEvent(
			{
				type: "participant_checked_in",
				event_id: "event-1",
				ticket_id: "ticket-1",
				source_type: "json_sync",
				seq: 2,
			},
			"server-new",
		);

		expect(runAsync).toHaveBeenCalledWith(
			"UPDATE participant_entities SET last_seq=0 WHERE event_id=?",
			"event-1",
		);
		expect(runAsync).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO sync_cursors"),
			"event-1",
			"server-new",
			2,
			expect.any(Number),
		);
	});

	it("commits an empty replay boundary from a replaced authority", async () => {
		getFirstAsync.mockResolvedValueOnce({ server_instance_id: "server-old" });

		await completeRealtimeSync("event-1", "server-new", 0);

		expect(runAsync).toHaveBeenCalledWith(
			"UPDATE participant_entities SET last_seq=0 WHERE event_id=?",
			"event-1",
		);
		expect(runAsync).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO sync_cursors"),
			"event-1",
			"server-new",
			0,
			expect.any(Number),
		);
	});

	it("merges a partial participant update into its durable snapshot", async () => {
		getFirstAsync
			.mockResolvedValueOnce({ server_instance_id: "server-a", last_seq: 4 })
			.mockResolvedValueOnce({
				participant_id: "participant-1",
				payload_json: JSON.stringify({
					id: "participant-1",
					ticketId: "ticket-1",
					name: "Antes",
					checkinDone: false,
				}),
				authoritative_checkin: 0,
				last_seq: 4,
			});

		await persistRealtimeEvent(
			{
				type: "participant_updated",
				event_id: "event-1",
				participant_id: "participant-1",
				ticket_id: "ticket-1",
				name: "Depois",
				seq: 8,
			},
			"server-a",
		);

		const calls = runAsync.mock.calls as unknown[][];
		const entityWrite = calls.find(([sql]) =>
			String(sql).includes("INSERT INTO participant_entities"),
		);
		expect(entityWrite).toBeDefined();
		expect(JSON.parse(String(entityWrite?.[5]))).toMatchObject({
			name: "Depois",
			ticketId: "ticket-1",
		});
	});
});
