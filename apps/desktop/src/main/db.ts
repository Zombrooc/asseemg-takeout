import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS pairing_tokens (token TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS paired_devices (device_id TEXT PRIMARY KEY, access_token TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, operator_alias TEXT);
CREATE TABLE IF NOT EXISTS events (event_id TEXT PRIMARY KEY, name TEXT, start_date TEXT, end_date TEXT, start_time TEXT, imported_at TEXT NOT NULL, source_type TEXT NOT NULL DEFAULT 'json_sync', archived_at TEXT);
CREATE TABLE IF NOT EXISTS takeout_events (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE, ticket_id TEXT NOT NULL, device_id TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT, created_at TEXT NOT NULL, source_type TEXT, event_id TEXT, participant_id TEXT, participant_name TEXT, birth_date TEXT, age_at_checkin INTEGER, ticket_source_id TEXT, ticket_name TEXT, ticket_code TEXT, operator_alias TEXT, operator_device_id TEXT, checked_in_at TEXT);
CREATE TABLE IF NOT EXISTS check_ins (ticket_id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, device_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY, event_id TEXT, name TEXT, cpf TEXT, birth_date TEXT, raw_json TEXT);
CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, participant_id TEXT, code TEXT, raw_json TEXT);
CREATE TABLE IF NOT EXISTS custom_forms (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT, definition_json TEXT);
CREATE TABLE IF NOT EXISTS event_log (seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL, type TEXT NOT NULL, payload_json TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS locks (participant_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_participants (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, bib_number INTEGER NOT NULL, full_name TEXT NOT NULL, sex TEXT, cpf_digits TEXT NOT NULL, birth_date_iso TEXT NOT NULL, modality TEXT, shirt_size TEXT, team TEXT, raw_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, is_manual INTEGER NOT NULL DEFAULT 0);
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

export type SqliteDatabase = Database.Database;

export function openDatabase(path: string): SqliteDatabase {
	mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	db.exec(SCHEMA_SQL);
	return db;
}

export function openMemoryDatabase(): SqliteDatabase {
	const db = new Database(":memory:");
	db.exec(SCHEMA_SQL);
	return db;
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

export function computeAge(
	birthDate: string | null | undefined,
): number | null {
	if (!birthDate) return null;
	const birth = new Date(`${birthDate.slice(0, 10)}T00:00:00Z`);
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
