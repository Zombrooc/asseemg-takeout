import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

type SqliteParameter = unknown;

export interface SqliteStatement {
	all(...params: SqliteParameter[]): unknown[];
	get(...params: SqliteParameter[]): unknown;
	run(...params: SqliteParameter[]): {
		changes: number | bigint;
		lastInsertRowid: number | bigint;
	};
}

interface SqliteDriver {
	exec(sql: string): void;
	prepare(sql: string): {
		all(...params: SqliteParameter[]): unknown[];
		get(...params: SqliteParameter[]): unknown;
		run(...params: SqliteParameter[]): {
			changes: number | bigint;
			lastInsertRowid: number | bigint;
		};
	};
	close(): void;
}

type BetterSqliteDriver = new (path: string) => SqliteDriver & {
	pragma(sql: string): unknown;
};

type NodeSqliteDriver = new (path: string) => SqliteDriver;

const require = createRequire(import.meta.url);

// Electron 44 ships Node 24's built-in SQLite API. The fallback keeps the
// Node 20 Vitest process usable without making the Electron runtime native.
function getDatabaseDriver(): {
	driver: NodeSqliteDriver | BetterSqliteDriver;
	isNodeSqlite: boolean;
} {
	try {
		const { DatabaseSync } = require("node:sqlite") as {
			DatabaseSync: NodeSqliteDriver;
		};
		return { driver: DatabaseSync, isNodeSqlite: true };
	} catch {
		const BetterSqlite3 = require("better-sqlite3") as BetterSqliteDriver;
		return { driver: BetterSqlite3, isNodeSqlite: false };
	}
}

export interface SqliteDatabase {
	exec(sql: string): void;
	prepare(sql: string): SqliteStatement;
	pragma(sql: string): unknown;
	transaction<T>(callback: () => T): () => T;
	close(): void;
}

class SqliteDatabaseAdapter implements SqliteDatabase {
	private readonly raw: SqliteDriver & Partial<{ pragma(sql: string): unknown }>;
	private readonly isNodeSqlite: boolean;

	constructor(path: string) {
		const database = getDatabaseDriver();
		this.raw = new database.driver(path);
		this.isNodeSqlite = database.isNodeSqlite;
	}

	exec(sql: string): void {
		this.raw.exec(sql);
	}

	prepare(sql: string): SqliteStatement {
		return this.raw.prepare(sql);
	}

	pragma(sql: string): unknown {
		if (!this.isNodeSqlite && this.raw.pragma) return this.raw.pragma(sql);
		return this.raw.exec(`PRAGMA ${sql}`);
	}

	transaction<T>(callback: () => T): () => T {
		return () => {
			this.raw.exec("BEGIN");
			try {
				const result = callback();
				this.raw.exec("COMMIT");
				return result;
			} catch (error) {
				try {
					this.raw.exec("ROLLBACK");
				} catch {
					// Preserve the original transaction error.
				}
				throw error;
			}
		};
	}

	close(): void {
		this.raw.close();
	}
}

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS pairing_tokens (token TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS authority_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS paired_devices (device_id TEXT PRIMARY KEY, access_token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, operator_alias TEXT);
CREATE TABLE IF NOT EXISTS events (event_id TEXT PRIMARY KEY, name TEXT, start_date TEXT, end_date TEXT, start_time TEXT, imported_at TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'json_sync', archived_at TEXT);
CREATE TABLE IF NOT EXISTS takeout_events (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE, ticket_id TEXT NOT NULL, device_id TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT, created_at TEXT NOT NULL, source_type TEXT, event_id TEXT, participant_id TEXT, participant_name TEXT, birth_date TEXT, age_at_checkin INTEGER, ticket_source_id TEXT, ticket_name TEXT, ticket_code TEXT, operator_alias TEXT, operator_device_id TEXT, checked_in_at TEXT);
CREATE TABLE IF NOT EXISTS check_ins (ticket_id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, device_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY, event_id TEXT, name TEXT, cpf TEXT, birth_date TEXT, raw_json TEXT);
CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, participant_id TEXT, code TEXT, raw_json TEXT);
CREATE TABLE IF NOT EXISTS custom_forms (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT, definition_json TEXT);
CREATE TABLE IF NOT EXISTS event_log (seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL, type TEXT NOT NULL, payload_json TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS locks (participant_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_participants (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, bib_number INTEGER NOT NULL, full_name TEXT NOT NULL, sex TEXT, cpf_digits TEXT NOT NULL, birth_date_iso TEXT NOT NULL, modality TEXT, shirt_size TEXT, team TEXT, qrcode TEXT, raw_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, is_manual INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS legacy_reserved_numbers (event_id TEXT NOT NULL, bib_number INTEGER NOT NULL, label TEXT, status TEXT NOT NULL DEFAULT 'available', created_at TEXT NOT NULL, used_at TEXT, used_by_participant_id TEXT, UNIQUE(event_id, bib_number));
CREATE TABLE IF NOT EXISTS legacy_checkins (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE, event_id TEXT NOT NULL, participant_id TEXT NOT NULL, device_id TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT, created_at TEXT NOT NULL, source_type TEXT, ticket_id TEXT, participant_name TEXT, birth_date TEXT, age_at_checkin INTEGER, ticket_source_id TEXT, ticket_name TEXT, ticket_code TEXT, operator_alias TEXT, operator_device_id TEXT, checked_in_at TEXT);
CREATE INDEX IF NOT EXISTS idx_event_log_event_id ON event_log(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_cpf ON participants(cpf);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_participant_id ON tickets(participant_id);
CREATE INDEX IF NOT EXISTS idx_legacy_participants_event_id ON legacy_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_legacy_participants_cpf ON legacy_participants(cpf_digits);
CREATE INDEX IF NOT EXISTS idx_legacy_reserved_numbers_event_id ON legacy_reserved_numbers(event_id);
CREATE INDEX IF NOT EXISTS idx_legacy_checkins_event_id ON legacy_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_legacy_checkins_participant_id ON legacy_checkins(participant_id);
`;

export function openDatabase(path: string): SqliteDatabase {
	mkdirSync(dirname(path), { recursive: true });
	const db = new SqliteDatabaseAdapter(path);
	initializeDatabase(db);
	return db;
}

export function openMemoryDatabase(): SqliteDatabase {
	const db = new SqliteDatabaseAdapter(":memory:");
	initializeDatabase(db);
	return db;
}

/**
 * Creates the current schema and upgrades databases created by older builds.
 * SQLite's CREATE TABLE IF NOT EXISTS does not add columns to an existing
 * table, so all runtime schema changes must be applied explicitly here.
 */
export function initializeDatabase(db: SqliteDatabase): void {
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	movePeerSchemaCollisions(db);
	applyRuntimeMigrations(db);
	db.exec(SCHEMA_SQL);
	ensureLegacyQrCodeColumn(db);
}

function tableExists(db: SqliteDatabase, tableName: string): boolean {
	return Boolean(
		db
			.prepare(
				"SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
			)
			.get(tableName),
	);
}

function tableColumns(db: SqliteDatabase, tableName: string): Set<string> {
	return new Set(
		(
			db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
				name: string;
			}>
		).map((column) => column.name),
	);
}

/**
 * A development P2P build used the same table names as the takeout store but
 * with a different schema. Keep those tables intact under compatibility names
 * so opening the database with the stable desktop build cannot fail with
 * errors such as "no such column: name".
 */
function movePeerSchemaCollisions(db: SqliteDatabase): void {
	const collisions = [
		["participants", "peer_participants"],
		["tickets", "peer_tickets"],
		["check_ins", "peer_check_ins"],
		["custom_forms", "peer_custom_forms"],
		["events", "peer_events"],
	] as const;

	for (const [tableName, compatibilityName] of collisions) {
		if (!tableExists(db, tableName) || tableExists(db, compatibilityName))
			continue;
		const columns = tableColumns(db, tableName);
		const isPeerTable =
			(tableName === "events" && columns.has("event_type")) ||
			(tableName !== "events" && columns.has("session_id"));
		if (isPeerTable)
			db.exec(`ALTER TABLE ${tableName} RENAME TO ${compatibilityName}`);
	}
}

function ensureColumn(
	db: SqliteDatabase,
	tableName: string,
	columnName: string,
	definition: string,
): void {
	if (!tableExists(db, tableName)) return;
	if (!tableColumns(db, tableName).has(columnName))
		db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function applyRuntimeMigrations(db: SqliteDatabase): void {
	const columns = [
		["events", "source_type", "TEXT NOT NULL DEFAULT 'json_sync'"],
		["events", "archived_at", "TEXT"],
		["paired_devices", "operator_alias", "TEXT"],
		["participants", "event_id", "TEXT"],
		["participants", "name", "TEXT"],
		["participants", "cpf", "TEXT"],
		["participants", "birth_date", "TEXT"],
		["participants", "raw_json", "TEXT"],
		["tickets", "participant_id", "TEXT"],
		["tickets", "code", "TEXT"],
		["tickets", "raw_json", "TEXT"],
		["takeout_events", "source_type", "TEXT"],
		["takeout_events", "event_id", "TEXT"],
		["takeout_events", "participant_id", "TEXT"],
		["takeout_events", "participant_name", "TEXT"],
		["takeout_events", "birth_date", "TEXT"],
		["takeout_events", "age_at_checkin", "INTEGER"],
		["takeout_events", "ticket_source_id", "TEXT"],
		["takeout_events", "ticket_name", "TEXT"],
		["takeout_events", "ticket_code", "TEXT"],
		["takeout_events", "operator_alias", "TEXT"],
		["takeout_events", "operator_device_id", "TEXT"],
		["takeout_events", "checked_in_at", "TEXT"],
		["legacy_participants", "is_manual", "INTEGER NOT NULL DEFAULT 0"],
		["legacy_checkins", "source_type", "TEXT"],
		["legacy_checkins", "ticket_id", "TEXT"],
		["legacy_checkins", "participant_name", "TEXT"],
		["legacy_checkins", "birth_date", "TEXT"],
		["legacy_checkins", "age_at_checkin", "INTEGER"],
		["legacy_checkins", "ticket_source_id", "TEXT"],
		["legacy_checkins", "ticket_name", "TEXT"],
		["legacy_checkins", "ticket_code", "TEXT"],
		["legacy_checkins", "operator_alias", "TEXT"],
		["legacy_checkins", "operator_device_id", "TEXT"],
		["legacy_checkins", "checked_in_at", "TEXT"],
	] as const;

	for (const [tableName, columnName, definition] of columns)
		ensureColumn(db, tableName, columnName, definition);
}

function ensureLegacyQrCodeColumn(db: SqliteDatabase): void {
	const columns = db
		.prepare("PRAGMA table_info(legacy_participants)")
		.all() as Array<{ name: string }>;
	if (!columns.some((column) => column.name === "qrcode"))
		db.exec("ALTER TABLE legacy_participants ADD COLUMN qrcode TEXT");
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function nowEpoch(): number {
	return Math.floor(Date.now() / 1000);
}

export function normalizeDigits(value: string | null | undefined): string {
	return value?.replace(/\D/g, "") ?? "";
}

export function normalizeText(value: string | null | undefined): string {
	return (value ?? "")
		.trim()
		.toLocaleLowerCase("pt-BR")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalizes date-only values from CSV/API payloads without using the host
 * locale parser. CSV files commonly contain Brazilian dates (DD/MM/YYYY),
 * while the API contract uses YYYY-MM-DD.
 */
export function normalizeBirthDate(
	value: string | null | undefined,
): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;

	const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(trimmed);
	if (iso) {
		const [, year, month, day] = iso;
		const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
		if (
			date.getUTCFullYear() === Number(year) &&
			date.getUTCMonth() === Number(month) - 1 &&
			date.getUTCDate() === Number(day)
		)
			return `${year}-${month}-${day}`;
	}

	const brazilian = /^(\d{1,2})[\\/.\-](\d{1,2})[\\/.\-](\d{4})(?:\s|$)/.exec(trimmed);
	if (brazilian) {
		const [, day, month, year] = brazilian;
		const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
		if (
			date.getUTCFullYear() === Number(year) &&
			date.getUTCMonth() === Number(month) - 1 &&
			date.getUTCDate() === Number(day)
		)
			return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
	}

	return trimmed;
}

export function computeAge(
	birthDate: string | null | undefined,
): number | null {
	const normalized = normalizeBirthDate(birthDate);
	if (!normalized) return null;
	const birth = new Date(`${normalized.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(birth.getTime())) return null;
	const today = new Date();
	let age = today.getUTCFullYear() - birth.getUTCFullYear();
	const beforeBirthday =
		today.getUTCMonth() < birth.getUTCMonth() ||
		(today.getUTCMonth() === birth.getUTCMonth() &&
			today.getUTCDate() < birth.getUTCDate());
	if (beforeBirthday) age -= 1;
	return age >= 0 ? age : null;
}

export function safeJson(
	value: string | null | undefined,
): Record<string, unknown> {
	if (!value) return {};
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}
