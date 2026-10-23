import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "asseemg-takeout.db";
let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

/** React Query is only a view cache: durable takeout state lives here. */
export function getTakeoutDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS sync_operations (
          operation_id TEXT PRIMARY KEY, event_id TEXT NOT NULL, entity_id TEXT NOT NULL,
          action TEXT NOT NULL, payload_json TEXT NOT NULL, expected_version INTEGER,
          source_type TEXT NOT NULL DEFAULT 'json_sync',
          status TEXT NOT NULL CHECK(status IN ('pending','sending','acknowledged','conflict','failed')),
          attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
          next_retry_at INTEGER NOT NULL, last_error TEXT, acknowledged_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_sync_operations_ready ON sync_operations(status, next_retry_at, created_at);
        CREATE INDEX IF NOT EXISTS idx_sync_operations_entity ON sync_operations(entity_id, created_at);
        CREATE TABLE IF NOT EXISTS local_checkin_projection (
          entity_id TEXT PRIMARY KEY, event_id TEXT NOT NULL,
          state TEXT NOT NULL CHECK(state IN ('authoritative','pending','sending','conflict')),
          operation_id TEXT, authoritative_json TEXT, updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sync_cursors (
          event_id TEXT PRIMARY KEY, server_instance_id TEXT NOT NULL,
          last_seq INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
        );
      `);
      return database;
    });
  }
  return databasePromise;
}

export function resetTakeoutDatabaseForTests(): void { databasePromise = null; }
