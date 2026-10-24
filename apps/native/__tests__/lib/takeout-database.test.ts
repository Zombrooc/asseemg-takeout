const execAsync = jest.fn(async () => undefined);
const getFirstAsync = jest.fn(async () => ({ user_version: 3 }));
const withExclusiveTransactionAsync = jest.fn();

jest.mock("expo-sqlite", () => ({
	openDatabaseAsync: jest.fn(async () => ({
		execAsync,
		getFirstAsync,
		withExclusiveTransactionAsync,
	})),
}));

import {
	resetTakeoutDatabaseForTests,
	runTakeoutWrite,
	withTakeoutWriteTransaction,
} from "@/lib/storage/takeout-database";

describe("takeout SQLite write coordinator", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		resetTakeoutDatabaseForTests();
	});

	it("does not overlap an outbox write with an exclusive replay transaction", async () => {
		let releaseFirst!: () => void;
		let markFirstStarted!: () => void;
		const firstGate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});
		const firstStarted = new Promise<void>((resolve) => {
			markFirstStarted = resolve;
		});
		const order: string[] = [];

		withExclusiveTransactionAsync.mockImplementation(
			async (callback: (tx: object) => Promise<void>) => callback({}),
		);

		const replay = withTakeoutWriteTransaction(async () => {
			order.push("replay:start");
			markFirstStarted();
			await firstGate;
			order.push("replay:end");
		});
		const outbox = runTakeoutWrite(async () => {
			order.push("outbox");
		});

		await firstStarted;
		expect(order).toEqual(["replay:start"]);

		releaseFirst();
		await Promise.all([replay, outbox]);
		expect(order).toEqual(["replay:start", "replay:end", "outbox"]);
	});

	it("continues processing writes after a failed task", async () => {
		withExclusiveTransactionAsync.mockImplementation(
			async (callback: (tx: object) => Promise<void>) => callback({}),
		);

		await expect(
			withTakeoutWriteTransaction(async () => {
				throw new Error("write failed");
			}),
		).rejects.toThrow("write failed");

		const next = jest.fn(async () => "ok");
		await expect(runTakeoutWrite(next)).resolves.toBe("ok");
		expect(next).toHaveBeenCalledTimes(1);
	});

	it("configures WAL and a bounded busy timeout", async () => {
		await runTakeoutWrite(async () => undefined);

		expect(execAsync).toHaveBeenCalledWith(
			expect.stringContaining("PRAGMA journal_mode = WAL"),
		);
		expect(execAsync).toHaveBeenCalledWith(
			expect.stringContaining("PRAGMA busy_timeout = 5000"),
		);
	});
});
