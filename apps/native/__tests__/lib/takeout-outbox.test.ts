const runAsync = jest.fn();
const getFirstAsync = jest.fn();
const withTakeoutWriteTransaction = jest.fn(
	async (callback: (tx: { runAsync: typeof runAsync }) => Promise<void>) =>
		callback({ runAsync }),
);
const runTakeoutWrite = jest.fn(
	async (
		callback: (database: { runAsync: typeof runAsync }) => Promise<unknown>,
	) => callback({ runAsync }),
);

jest.mock("@/lib/storage/takeout-database", () => ({
	getTakeoutDatabase: jest.fn(async () => ({ getFirstAsync })),
	runTakeoutWrite,
	withTakeoutWriteTransaction,
}));

import {
	acknowledgeOperation,
	failOperation,
	markSending,
	nextOperationWakeAt,
	outboxConfig,
	recoverExpiredSending,
	retryAt,
} from "@/lib/storage/takeout-outbox";

describe("durable outbox scheduling", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		runAsync.mockResolvedValue({ changes: 1 });
	});

	it("claims pending work with a bounded sending lease", async () => {
		const now = 1_000;
		await expect(markSending("operation-1", now)).resolves.toBe(true);
		expect(runAsync).toHaveBeenCalledWith(
			expect.stringContaining("status='sending'"),
			now + outboxConfig.SEND_LEASE_MS,
			now,
			"operation-1",
		);
	});

	it("recovers interrupted sending operations after lease expiry", async () => {
		await expect(recoverExpiredSending(50_000)).resolves.toBe(1);
		expect(runAsync).toHaveBeenCalledWith(
			expect.stringContaining("WHERE status='sending'"),
			50_000,
			50_000,
			50_000,
		);
	});

	it("persists and exposes the next wake time", async () => {
		getFirstAsync.mockResolvedValue({ wake_at: 99_000 });
		await expect(nextOperationWakeAt()).resolves.toBe(99_000);
	});

	it("uses bounded exponential backoff with jitter", () => {
		const now = 10_000;
		const first = retryAt(1, now);
		const capped = retryAt(100, now);
		expect(first).toBeGreaterThanOrEqual(now + 2_000);
		expect(first).toBeLessThan(now + 2_400);
		expect(capped).toBeGreaterThanOrEqual(now + 60_000);
		expect(capped).toBeLessThan(now + 72_000);
	});

	it("consolidates an ACK in the operation, projection and durable participant", async () => {
		await acknowledgeOperation({
			operationId: "operation-1",
			eventId: "event-1",
			entityId: "ticket-1",
			action: "confirm_checkin",
			payload: {},
			sourceType: "json_sync",
			status: "sending",
			attempts: 1,
			createdAt: 1,
			nextRetryAt: 1,
		});

		expect(withTakeoutWriteTransaction).toHaveBeenCalledTimes(1);
		expect(runAsync).toHaveBeenCalledWith(
			expect.stringContaining("status='acknowledged'"),
			expect.any(Number),
			expect.any(Number),
			"operation-1",
		);
		expect(runAsync).toHaveBeenCalledWith(
			expect.stringContaining("authoritative_checkin=1"),
			expect.any(Number),
			"event-1",
			"json_sync",
			"ticket-1",
		);
	});

	it("persists a permanent failure without deleting the operation", async () => {
		await failOperation(
			{
				operationId: "operation-failed",
				eventId: "event-1",
				entityId: "ticket-1",
				action: "confirm_checkin",
				payload: {},
				sourceType: "json_sync",
				status: "sending",
				attempts: 1,
				createdAt: 1,
				nextRetryAt: 1,
			},
			"TICKET_NOT_FOUND",
		);

		expect(runAsync).toHaveBeenCalledWith(
			expect.stringContaining("status='failed'"),
			"TICKET_NOT_FOUND",
			expect.any(Number),
			"operation-failed",
		);
		expect(runAsync).toHaveBeenCalledWith(
			expect.stringContaining("state='failed'"),
			expect.any(Number),
			"event-1",
			"json_sync",
			"ticket-1",
			"operation-failed",
		);
	});
});
