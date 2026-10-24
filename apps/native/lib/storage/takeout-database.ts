import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "asseemg-takeout.db";
const DATABASE_VERSION = 3;
let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;
let writeTail: Promise<void> = Promise.resolve();

async function migrateDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
	const version = await database.getFirstAsync<{ user_version: number }>(
		"PRAGMA user_version",
	);
	const currentVersion = version?.user_version ?? 0;
	if (currentVersion >= DATABASE_VERSION) return;

	await database.withExclusiveTransactionAsync(async (tx) => {
		if (currentVersion < 2) {
			const operationColumns = await tx.getAllAsync<{ name: string }>(
				"PRAGMA table_info(sync_operations)",
			);
			if (
				!operationColumns.some((column) => column.name === "lease_expires_at")
			) {
				await tx.execAsync(
					"ALTER TABLE sync_operations ADD COLUMN lease_expires_at INTEGER",
				);
			}
			if (!operationColumns.some((column) => column.name === "updated_at")) {
				await tx.execAsync(
					"ALTER TABLE sync_operations ADD COLUMN updated_at INTEGER",
				);
			}
			await tx.execAsync(`
        CREATE TABLE IF NOT EXISTS local_checkin_projection_v2 (
          event_id TEXT NOT NULL,
          source_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          state TEXT NOT NULL CHECK(state IN ('authoritative','pending','sending','conflict','failed')),
          operation_id TEXT,
          authoritative_json TEXT,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY(event_id, source_type, entity_id)
        );
        INSERT OR IGNORE INTO local_checkin_projection_v2
          (event_id, source_type, entity_id, state, operation_id, authoritative_json, updated_at)
        SELECT p.event_id, COALESCE(o.source_type, 'json_sync'), p.entity_id,
          p.state, p.operation_id, p.authoritative_json, p.updated_at
        FROM local_checkin_projection p
        LEFT JOIN sync_operations o ON o.operation_id = p.operation_id;
        DROP TABLE local_checkin_projection;
        ALTER TABLE local_checkin_projection_v2 RENAME TO local_checkin_projection;
      `);
		}
		await tx.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
	});
}

/** React Query is only a view cache: durable takeout state lives here. */
export function getTakeoutDatabase() {
	if (!databasePromise) {
		databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(
			async (database) => {
				await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS sync_operations (
          operation_id TEXT PRIMARY KEY, event_id TEXT NOT NULL, entity_id TEXT NOT NULL,
          action TEXT NOT NULL, payload_json TEXT NOT NULL, expected_version INTEGER,
          source_type TEXT NOT NULL DEFAULT 'json_sync',
          status TEXT NOT NULL CHECK(status IN ('pending','sending','acknowledged','conflict','failed')),
          attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
          next_retry_at INTEGER NOT NULL, last_error TEXT, acknowledged_at INTEGER,
          lease_expires_at INTEGER, updated_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_sync_operations_ready ON sync_operations(status, next_retry_at, created_at);
        CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(entity_id, created_at);
        CREATE TABLE IF NOT EXISTS local_checkin_projection (
          event_id TEXT NOT NULL, source_type TEXT NOT NULL, entity_id TEXT NOT NULL,
          state TEXT NOT NULL CHECK(state IN ('authoritative','pending','sending','conflict','failed')),
          operation_id TEXT, authoritative_json TEXT, updated_at INTEGER NOT NULL
          , PRIMARY KEY(event_id, source_type, entity_id)
        );
        CREATE TABLE IF NOT EXISTS sync_cursors (
          event_id TEXT PRIMARY KEY, server_instance_id TEXT NOT NULL,
          last_seq INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS participant_entities (
          event_id TEXT NOT NULL,
          source_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          participant_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          authoritative_checkin INTEGER NOT NULL DEFAULT 0,
          last_seq INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY(event_id, source_type, entity_id)
        );
        CREATE INDEX IF NOT EXISTS idx_participant_entities_participant
          ON participant_entities(event_id, source_type, participant_id);
        CREATE TABLE IF NOT EXISTS participant_event_metadata (
          event_id TEXT PRIMARY KEY,
          source_type TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
				await migrateDatabase(database);
				return database;
			},
		);
	}
	return databasePromise;
}

/**
 * Expo opens an independent connection for an exclusive transaction. Its
 * documented behaviour is to reject any concurrent async write with
 * SQLITE_BUSY, so every takeout write must pass through this coordinator.
 * Reads remain concurrent under WAL.
 */
export function runTakeoutWrite<T>(
	task: (database: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
	const result = writeTail.then(async () => task(await getTakeoutDatabase()));
	writeTail = result.then(
		() => undefined,
		() => undefined,
	);
	return result;
}

export function withTakeoutWriteTransaction<T>(
	task: (transaction: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
	return runTakeoutWrite(async (database) => {
		let result!: T;
		await database.withExclusiveTransactionAsync(async (transaction) => {
			result = await task(transaction);
		});
		return result;
	});
}

export function resetTakeoutDatabaseForTests(): void {
	databasePromise = null;
	writeTail = Promise.resolve();
}

export async function getSyncCursor(
	eventId: string,
): Promise<{ serverInstanceId: string; lastSeq: number } | null> {
	return (await getTakeoutDatabase()).getFirstAsync<{
		serverInstanceId: string;
		lastSeq: number;
	}>(
		"SELECT server_instance_id serverInstanceId,last_seq lastSeq FROM sync_cursors WHERE event_id=?",
		eventId,
	);
}

export async function advanceSyncCursor(
	eventId: string,
	serverInstanceId: string,
	lastSeq: number,
): Promise<void> {
	await runTakeoutWrite(async (database) => {
		await database.runAsync(
			`INSERT INTO sync_cursors(event_id,server_instance_id,last_seq,updated_at) VALUES(?,?,?,?)
       ON CONFLICT(event_id) DO UPDATE SET server_instance_id=excluded.server_instance_id,
         last_seq=CASE WHEN sync_cursors.server_instance_id=excluded.server_instance_id THEN MAX(sync_cursors.last_seq,excluded.last_seq) ELSE excluded.last_seq END,
         updated_at=excluded.updated_at`,
			eventId,
			serverInstanceId,
			lastSeq,
			Date.now(),
		);
	});
}
