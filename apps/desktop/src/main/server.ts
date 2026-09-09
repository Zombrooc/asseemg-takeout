import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server as HttpServer } from "node:http";
import os from "node:os";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { WebSocketServer, WebSocket } from "ws";
import type { SqliteDatabase } from "./db";
import {
	computeAge,
	normalizeDigits,
	normalizeText,
	nowEpoch,
	nowIso,
	safeJson,
} from "./db";

const PORT = 5555;
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 25 * 1024 * 1024 },
});

export type TakeoutServer = {
	app: Express;
	httpServer: HttpServer;
	wsServer: WebSocketServer;
	close(): Promise<void>;
};

type ServerOptions = {
	db: SqliteDatabase;
	baseUrl?: string;
};

type EventRow = {
	event_id: string;
	name: string | null;
	start_date: string | null;
	end_date: string | null;
	start_time: string | null;
	imported_at: string;
	source_type: string;
	archived_at: string | null;
};

type ParticipantRow = {
	id: string;
	event_id: string;
	name: string | null;
	cpf: string | null;
	birth_date: string | null;
	participant_raw_json: string | null;
	ticket_id: string;
	ticket_code: string | null;
	ticket_raw_json: string | null;
	checkin_done: number;
};

function json(res: Response, status: number, body: unknown): Response {
	return res.status(status).json(body);
}

function error(
	res: Response,
	status: number,
	message: string,
	code?: string,
): Response {
	return json(res, status, { error: message, ...(code ? { code } : {}) });
}

function parseBool(value: unknown): boolean {
	return value === true || value === "true" || value === "1";
}

function getIpAddresses(): Array<{
	interfaceName: string;
	ip: string;
	url: string;
	isPrimary: boolean;
}> {
	const addresses: Array<{
		interfaceName: string;
		ip: string;
		url: string;
		isPrimary: boolean;
	}> = [];
	for (const [interfaceName, entries] of Object.entries(
		os.networkInterfaces(),
	)) {
		for (const entry of entries ?? []) {
			if (entry.family !== "IPv4" || entry.internal) continue;
			addresses.push({
				interfaceName,
				ip: entry.address,
				url: `http://${entry.address}:${PORT}`,
				isPrimary: false,
			});
		}
	}
	addresses.sort(
		(a, b) =>
			a.interfaceName.localeCompare(b.interfaceName) ||
			a.ip.localeCompare(b.ip),
	);
	if (addresses.length > 0) addresses[0].isPrimary = true;
	return addresses;
}

function pairingUrlBase(): string {
	const primary = getIpAddresses().find((address) => address.isPrimary);
	return primary?.url ?? `http://127.0.0.1:${PORT}`;
}

function createPairingToken(): { token: string; expiresAt: string } {
	const token = randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
	return { token, expiresAt: String(Math.floor(Date.now() / 1000) + 15 * 60) };
}

function getPairingInfo(
	db: SqliteDatabase,
	baseUrl: string,
): { baseUrl: string; pairingToken: string; expiresAt: string } {
	const current = db
		.prepare(
			"SELECT token, expires_at FROM pairing_tokens WHERE CAST(expires_at AS INTEGER) > ? ORDER BY CAST(expires_at AS INTEGER) DESC LIMIT 1",
		)
		.get(nowEpoch()) as { token: string; expires_at: string } | undefined;
	if (current)
		return {
			baseUrl,
			pairingToken: current.token,
			expiresAt: current.expires_at,
		};
	const generated = createPairingToken();
	db.prepare(
		"INSERT INTO pairing_tokens (token, expires_at) VALUES (?, ?)",
	).run(generated.token, generated.expiresAt);
	return {
		baseUrl,
		pairingToken: generated.token,
		expiresAt: generated.expiresAt,
	};
}

function getIdentity(
	db: SqliteDatabase,
	req: Request,
	fallbackDeviceId: string,
): { deviceId: string; operatorAlias: string | null } {
	const header = req.header("authorization");
	const accessToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
	if (!accessToken) return { deviceId: fallbackDeviceId, operatorAlias: null };
	const paired = db
		.prepare(
			"SELECT device_id, operator_alias FROM paired_devices WHERE access_token = ?",
		)
		.get(accessToken) as
		| { device_id: string; operator_alias: string | null }
		| undefined;
	return paired
		? { deviceId: paired.device_id, operatorAlias: paired.operator_alias }
		: { deviceId: fallbackDeviceId, operatorAlias: null };
}

function parseRawParticipant(row: ParticipantRow): Record<string, unknown> {
	return {
		...safeJson(row.participant_raw_json),
		...safeJson(row.ticket_raw_json),
	};
}

function mapParticipant(row: ParticipantRow) {
	const raw = parseRawParticipant(row);
	const customFormResponses = Array.isArray(raw.customFormResponses)
		? raw.customFormResponses
		: Array.isArray(raw.custom_form_responses)
			? raw.custom_form_responses
			: [];
	return {
		id: row.id,
		name:
			row.name ??
			(typeof raw.participantName === "string" ? raw.participantName : null),
		cpf: row.cpf,
		birthDate: row.birth_date,
		sex: typeof raw.sex === "string" ? raw.sex : null,
		shirtSize: typeof raw.shirtSize === "string" ? raw.shirtSize : null,
		team: typeof raw.team === "string" ? raw.team : null,
		ticketId: row.ticket_id,
		sourceTicketId: typeof raw.ticketId === "string" ? raw.ticketId : null,
		ticketName:
			typeof raw.ticketName === "string"
				? raw.ticketName
				: typeof raw.ticket_name === "string"
					? raw.ticket_name
					: null,
		qrCode:
			typeof raw.qrCode === "string"
				? raw.qrCode
				: (row.ticket_code ?? row.ticket_id),
		checkinDone: row.checkin_done === 1,
		bibNumber: typeof raw.bibNumber === "number" ? raw.bibNumber : null,
		customFormResponses,
	};
}

function participantRows(
	db: SqliteDatabase,
	eventId: string,
	search?: { q: string; mode: string },
): ParticipantRow[] {
	const rows = db
		.prepare(`
    SELECT p.id, p.event_id, p.name, p.cpf, p.birth_date, p.raw_json participant_raw_json,
           t.id ticket_id, t.code ticket_code, t.raw_json ticket_raw_json,
           EXISTS(SELECT 1 FROM check_ins c WHERE c.ticket_id = t.id) checkin_done
    FROM participants p JOIN tickets t ON t.participant_id = p.id
    WHERE p.event_id = ?
    ORDER BY p.name COLLATE NOCASE
  `)
		.all(eventId) as ParticipantRow[];
	if (!search) return rows;
	const query = search.q.trim();
	const normalized = normalizeText(query);
	const digits = normalizeDigits(query);
	return rows.filter((row) => {
		const item = mapParticipant(row) as Record<string, unknown>;
		const values = [
			item.name,
			item.cpf,
			item.birthDate,
			item.ticketId,
			item.sourceTicketId,
			item.qrCode,
			item.ticketName,
			item.bibNumber,
		]
			.filter((value) => value != null)
			.map(String);
		if (search.mode === "cpf")
			return normalizeDigits(String(item.cpf ?? "")).includes(digits);
		if (search.mode === "qr")
			return values.some((value) => value === query || value.includes(query));
		if (search.mode === "ticket_id")
			return String(item.ticketId).toLowerCase().includes(query.toLowerCase());
		if (search.mode === "birth_date")
			return String(item.birthDate ?? "").includes(query);
		return values.some((value) => normalizeText(value).includes(normalized));
	});
}

function mapLegacyParticipant(
	db: SqliteDatabase,
	row: Record<string, unknown>,
) {
	const eventId = String(row.event_id);
	const id = String(row.id);
	const checkin = db
		.prepare(
			"SELECT 1 FROM legacy_checkins WHERE event_id = ? AND participant_id = ? AND status = 'CONFIRMED'",
		)
		.get(eventId, id);
	return {
		id,
		bibNumber: Number(row.bib_number),
		name: String(row.full_name),
		sex: row.sex ?? null,
		cpf: String(row.cpf_digits),
		birthDate: String(row.birth_date_iso),
		modality: row.modality ?? null,
		shirtSize: row.shirt_size ?? null,
		team: row.team ?? null,
		checkinDone: Boolean(checkin),
	};
}

function broadcast(
	clients: Map<string, Set<WebSocket>>,
	eventId: string,
	message: object,
): void {
	const encoded = JSON.stringify(message);
	for (const client of clients.get(eventId) ?? []) {
		if (client.readyState === WebSocket.OPEN) client.send(encoded);
	}
}

function logEvent(
	db: SqliteDatabase,
	eventId: string,
	type: string,
	payload: object,
): void {
	db.prepare(
		"INSERT INTO event_log (event_id, type, payload_json, created_at) VALUES (?, ?, ?, ?)",
	).run(eventId, type, JSON.stringify(payload), nowEpoch());
}

function parseCsvLine(line: string, delimiter: "," | ";"): string[] {
	const cells: string[] = [];
	let current = "";
	let quoted = false;
	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];
		if (char === '"') {
			if (quoted && line[index + 1] === '"') {
				current += '"';
				index += 1;
			} else quoted = !quoted;
		} else if (char === delimiter && !quoted) {
			cells.push(current.trim());
			current = "";
		} else current += char;
	}
	cells.push(current.trim());
	return cells;
}

function repairText(value: string): string {
	let current = value;
	for (let pass = 0; pass < 3; pass += 1) {
		if (!/[ÃÂ�]/.test(current)) break;
		const bytes = Uint8Array.from(current, (char) => char.charCodeAt(0));
		try {
			const repaired = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
			if (repaired.length >= current.length) break;
			current = repaired;
		} catch {
			break;
		}
	}
	return current.trim();
}

function decodeUpload(buffer: Buffer): string {
	const utf8 = new TextDecoder("utf-8").decode(buffer);
	if (!utf8.includes("\uFFFD")) return repairText(utf8);
	return repairText(new TextDecoder("windows-1252").decode(buffer));
}

function normalizeHeader(value: string): string {
	return repairText(value)
		.replace(/^\uFEFF/, "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}

function csvRows(content: string): string[][] {
	const lines = content
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length < 2) throw new Error("CSV vazio");
	const delimiter = (
		lines[0].split(";").length > lines[0].split(",").length ? ";" : ","
	) as "," | ";";
	return lines.map((line) => parseCsvLine(line, delimiter).map(repairText));
}

function headerIndex(headers: string[], aliases: string[]): number {
	const normalized = headers.map(normalizeHeader);
	return normalized.findIndex((header) => aliases.includes(header));
}

function buildLegacyRows(
	content: string,
): Array<{
	number: number;
	name: string;
	sex: string;
	cpf: string;
	birthDate: string;
	modality: string;
	shirtSize: string;
	team: string;
}> {
	const [headers, ...rows] = csvRows(content);
	const index = {
		number: headerIndex(headers, [
			"numero",
			"bib",
			"bib number",
			"numero atleta",
		]),
		name: headerIndex(headers, [
			"nome",
			"nome completo",
			"nome do participante",
			"participante",
			"name",
		]),
		sex: headerIndex(headers, ["sexo", "genero", "gender"]),
		cpf: headerIndex(headers, ["cpf", "documento", "documento cpf"]),
		birthDate: headerIndex(headers, [
			"data de nascimento",
			"nascimento",
			"birth date",
			"data nascimento",
		]),
		modality: headerIndex(headers, [
			"modalidade",
			"categoria",
			"prova",
			"race",
		]),
		shirtSize: headerIndex(headers, [
			"tamanho da camisa",
			"tamanho camisa",
			"camisa",
			"shirt size",
		]),
		team: headerIndex(headers, ["equipe", "time", "assessoria", "team"]),
	};
	if (index.name < 0) throw new Error("coluna Nome Completo não encontrada");
	return rows
		.map((row) => ({
			number: Number.parseInt(row[index.number] ?? "0", 10),
			name: row[index.name] ?? "",
			sex: row[index.sex] ?? "",
			cpf: row[index.cpf] ?? "",
			birthDate: row[index.birthDate] ?? "",
			modality: row[index.modality] ?? "",
			shirtSize: row[index.shirtSize] ?? "",
			team: row[index.team] ?? "",
		}))
		.filter((row) => row.name.length > 0);
}

export function createTakeoutServer({
	db,
	baseUrl = pairingUrlBase(),
}: ServerOptions): TakeoutServer {
	const app = express();
	const httpServer = createServer(app);
	const wsServer = new WebSocketServer({ noServer: true });
	const clients = new Map<string, Set<WebSocket>>();

	app.use(
		cors({
			origin: true,
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
		}),
	);
	app.use(express.json({ limit: "10mb" }));

	app.get("/health", (_req, res) => json(res, 200, { status: "ok" }));
	app.get("/network/addresses", (_req, res) =>
		json(res, 200, { baseUrl, port: PORT, addresses: getIpAddresses() }),
	);
	app.get("/pair/info", (_req, res) =>
		json(res, 200, getPairingInfo(db, baseUrl)),
	);
	app.post("/pair/renew", (_req, res) => {
		const generated = createPairingToken();
		db.prepare(
			"INSERT INTO pairing_tokens (token, expires_at) VALUES (?, ?)",
		).run(generated.token, generated.expiresAt);
		return json(res, 200, {
			baseUrl,
			pairingToken: generated.token,
			expiresAt: generated.expiresAt,
		});
	});
	app.post("/pair", (req, res) => {
		const deviceId = String(req.body?.device_id ?? "").trim();
		const token = String(req.body?.pairing_token ?? "").trim();
		const operatorAlias = String(req.body?.operator_alias ?? "").trim();
		if (!operatorAlias)
			return error(
				res,
				400,
				"operator_alias is required",
				"OPERATOR_ALIAS_REQUIRED",
			);
		const pairing = db
			.prepare(
				"SELECT token FROM pairing_tokens WHERE token = ? AND CAST(expires_at AS INTEGER) > ?",
			)
			.get(token, nowEpoch());
		if (!pairing)
			return error(
				res,
				401,
				"invalid or expired pairing token",
				"PAIRING_TOKEN_INVALID",
			);
		const accessToken = randomUUID();
		db.prepare(
			"INSERT OR REPLACE INTO paired_devices (device_id, access_token, created_at, operator_alias) VALUES (?, ?, ?, ?)",
		).run(deviceId, accessToken, nowIso(), operatorAlias);
		return json(res, 200, { access_token: accessToken });
	});

	app.get("/participants/:id", (req, res) => {
		const row = db
			.prepare(
				"SELECT id, name, cpf, birth_date FROM participants WHERE id = ?",
			)
			.get(req.params.id) as
			| {
					id: string;
					name: string | null;
					cpf: string | null;
					birth_date: string | null;
			  }
			| undefined;
		return row
			? json(res, 200, {
					id: row.id,
					name: row.name,
					cpf: row.cpf,
					birth_date: row.birth_date,
				})
			: error(res, 404, "not found");
	});

	app.get("/events", (req, res) => {
		const includeArchived = parseBool(req.query.includeArchived);
		const rows = db
			.prepare(
				`SELECT event_id, name, start_date, end_date, start_time, imported_at, source_type, archived_at FROM events ${includeArchived ? "" : "WHERE archived_at IS NULL"} ORDER BY start_date DESC, imported_at DESC`,
			)
			.all() as EventRow[];
		return json(
			res,
			200,
			rows.map((row) => ({
				eventId: row.event_id,
				name: row.name,
				startDate: row.start_date,
				endDate: row.end_date,
				startTime: row.start_time,
				importedAt: row.imported_at,
				sourceType: row.source_type,
				archivedAt: row.archived_at,
			})),
		);
	});
	app.post("/events/:eventId/archive", (req, res) => {
		const result = db
			.prepare("UPDATE events SET archived_at = ? WHERE event_id = ?")
			.run(nowIso(), req.params.eventId);
		if (result.changes)
			broadcast(clients, "_events", { type: "events_list_changed" });
		return json(res, 200, { archived: result.changes > 0 });
	});
	app.post("/events/:eventId/unarchive", (req, res) => {
		const result = db
			.prepare("UPDATE events SET archived_at = NULL WHERE event_id = ?")
			.run(req.params.eventId);
		if (result.changes)
			broadcast(clients, "_events", { type: "events_list_changed" });
		return json(res, 200, { unarchived: result.changes > 0 });
	});
	app.delete("/events/:eventId", (req, res) => {
		const remove = db.transaction(() => {
			db.prepare("DELETE FROM legacy_checkins WHERE event_id = ?").run(
				req.params.eventId,
			);
			db.prepare("DELETE FROM legacy_reserved_numbers WHERE event_id = ?").run(
				req.params.eventId,
			);
			db.prepare("DELETE FROM legacy_participants WHERE event_id = ?").run(
				req.params.eventId,
			);
			db.prepare("DELETE FROM takeout_events WHERE event_id = ?").run(
				req.params.eventId,
			);
			db.prepare("DELETE FROM event_log WHERE event_id = ?").run(
				req.params.eventId,
			);
			db.prepare("DELETE FROM custom_forms WHERE event_id = ?").run(
				req.params.eventId,
			);
			const participants = db
				.prepare("SELECT id FROM participants WHERE event_id = ?")
				.all(req.params.eventId) as Array<{ id: string }>;
			for (const participant of participants)
				db.prepare("DELETE FROM tickets WHERE participant_id = ?").run(
					participant.id,
				);
			db.prepare("DELETE FROM participants WHERE event_id = ?").run(
				req.params.eventId,
			);
			db.prepare("DELETE FROM events WHERE event_id = ?").run(
				req.params.eventId,
			);
		});
		remove();
		broadcast(clients, "_events", { type: "events_list_changed" });
		return json(res, 200, { deleted: true });
	});
	app.get("/events/:eventId/participants", (req, res) =>
		json(
			res,
			200,
			participantRows(db, req.params.eventId).map((row) => mapParticipant(row)),
		),
	);
	app.get("/events/:eventId/participants/search", (req, res) => {
		const q = String(req.query.q ?? "").trim();
		const mode = String(req.query.mode ?? "").trim();
		if (!q) return error(res, 400, "q is required");
		if (!["qr", "ticket_id", "cpf", "nome", "birth_date"].includes(mode))
			return error(res, 400, "invalid mode");
		return json(
			res,
			200,
			participantRows(db, req.params.eventId, { q, mode }).map((row) =>
				mapParticipant(row),
			),
		);
	});
	app.put("/events/:eventId/participants/:participantId", (req, res) => {
		const body = req.body ?? {};
		const name = String(body.name ?? "").trim();
		const birthDate = String(body.birthDate ?? "").trim();
		const ticketType = String(body.ticketType ?? "").trim();
		if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !ticketType)
			return error(res, 400, "name, birthDate and ticketType are required");
		const checked = db
			.prepare(
				"SELECT 1 FROM check_ins c JOIN tickets t ON t.id = c.ticket_id WHERE t.participant_id = ?",
			)
			.get(req.params.participantId);
		if (checked) return error(res, 409, "participant already checked in");
		const result = db
			.prepare(
				"UPDATE participants SET name = ?, cpf = ?, birth_date = ?, raw_json = json_set(COALESCE(raw_json, '{}'), '$.ticketName', '$ticketName', '$.shirtSize', '$shirtSize', '$.team', '$team') WHERE id = ? AND event_id = ?",
			)
			.run(
				name,
				String(body.cpf ?? "").trim(),
				birthDate,
				req.params.participantId,
				req.params.eventId,
			);
		if (!result.changes) return error(res, 404, "participant not found");
		const row = db
			.prepare(
			"SELECT p.id, p.event_id, p.name, p.cpf, p.birth_date, p.raw_json participant_raw_json, t.id ticket_id, t.code ticket_code, t.raw_json ticket_raw_json, EXISTS(SELECT 1 FROM check_ins c WHERE c.ticket_id=t.id) checkin_done FROM participants p JOIN tickets t ON t.participant_id=p.id WHERE p.id=?",
			)
			.get(req.params.participantId) as ParticipantRow;
		logEvent(db, req.params.eventId, "participant_updated", {
			participant_id: req.params.participantId,
			ticket_id: row.ticket_id,
			source_type: "json_sync",
		});
		broadcast(clients, req.params.eventId, {
			type: "participant_updated",
			event_id: req.params.eventId,
			participant_id: req.params.participantId,
			ticket_id: row.ticket_id,
			source_type: "json_sync",
		});
		return json(res, 200, mapParticipant(row));
	});
	app.post("/events/:eventId/checkins/reset", (req, res) => {
		const tickets = db
			.prepare(
				"SELECT t.id FROM tickets t JOIN participants p ON p.id=t.participant_id WHERE p.event_id=?",
			)
			.all(req.params.eventId) as Array<{ id: string }>;
		const reset = db.transaction(() => {
			for (const ticket of tickets)
				db.prepare("DELETE FROM check_ins WHERE ticket_id=?").run(ticket.id);
		});
		reset();
		return json(res, 200, { deleted: tickets.length });
	});

	app.post("/takeout/confirm", (req, res) => {
		const payload = req.body ?? {};
		const requestId = String(payload.request_id ?? "").trim();
		const ticketId = String(payload.ticket_id ?? "").trim();
		if (!requestId || !ticketId)
			return error(res, 400, "request_id and ticket_id are required", "FAILED");
		const identity = getIdentity(
			db,
			req,
			String(payload.device_id ?? "desktop"),
		);
		const existing = db
			.prepare("SELECT status FROM takeout_events WHERE request_id=?")
			.get(requestId) as { status: string } | undefined;
		if (existing) return json(res, 200, { status: "DUPLICATE" });
		const checked = db
			.prepare("SELECT request_id FROM check_ins WHERE ticket_id=?")
			.get(ticketId) as { request_id: string } | undefined;
		if (checked)
			return json(res, 409, {
				status: "CONFLICT",
				existing_request_id: checked.request_id,
				ticket_id: ticketId,
			});
		const ticket = db
			.prepare(
			"SELECT p.event_id, p.id participant_id, p.name participant_name, p.birth_date, t.code ticket_code, t.raw_json FROM tickets t LEFT JOIN participants p ON p.id=t.participant_id WHERE t.id=?",
			)
			.get(ticketId) as
			| {
					event_id: string | null;
					participant_id: string | null;
					participant_name: string | null;
					birth_date: string | null;
					ticket_code: string | null;
					raw_json: string | null;
			  }
			| undefined;
		const timestamp = nowIso();
		db.transaction(() => {
			db.prepare(
				"INSERT INTO check_ins (ticket_id, request_id, device_id, created_at) VALUES (?, ?, ?, ?)",
			).run(ticketId, requestId, identity.deviceId, timestamp);
			db.prepare(
				"INSERT INTO takeout_events (request_id,ticket_id,device_id,status,payload_json,created_at,source_type,event_id,participant_id,participant_name,birth_date,age_at_checkin,ticket_code,operator_alias,operator_device_id,checked_in_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
			).run(
				requestId,
				ticketId,
				identity.deviceId,
				"CONFIRMED",
				payload.payload_json ?? null,
				timestamp,
				"json_sync",
				ticket?.event_id ?? null,
				ticket?.participant_id ?? null,
				ticket?.participant_name ?? null,
				ticket?.birth_date ?? null,
				computeAge(ticket?.birth_date),
				ticket?.ticket_code ?? null,
				identity.operatorAlias,
				identity.deviceId,
				timestamp,
			);
			if (ticket?.event_id)
				logEvent(db, ticket.event_id, "participant_checked_in", {
					ticket_id: ticketId,
					request_id: requestId,
					event_id: ticket.event_id,
					source_type: "json_sync",
				});
		})();
		if (ticket?.event_id)
			broadcast(clients, ticket.event_id, {
				type: "participant_checked_in",
				event_id: ticket.event_id,
				ticket_id: ticketId,
				request_id: requestId,
				source_type: "json_sync",
			});
		return json(res, 200, { status: "CONFIRMED" });
	});
	app.post("/takeout/undo", (req, res) => {
		const payload = req.body ?? {};
		const requestId = String(payload.request_id ?? "").trim();
		const ticketId = String(payload.ticket_id ?? "").trim();
		if (!requestId || !ticketId)
			return error(res, 400, "request_id and ticket_id are required", "FAILED");
		const identity = getIdentity(
			db,
			req,
			String(payload.device_id ?? "desktop"),
		);
		if (
			db
				.prepare("SELECT 1 FROM takeout_events WHERE request_id=?")
				.get(requestId)
		)
			return json(res, 200, { status: "DUPLICATE" });
		const checkin = db
			.prepare("SELECT request_id FROM check_ins WHERE ticket_id=?")
			.get(ticketId) as { request_id: string } | undefined;
		if (!checkin) return error(res, 409, "ticket not checked in", "FAILED");
		const ticket = db
			.prepare(
				"SELECT p.event_id, p.id participant_id FROM tickets t LEFT JOIN participants p ON p.id=t.participant_id WHERE t.id=?",
			)
			.get(ticketId) as
			| { event_id: string | null; participant_id: string | null }
			| undefined;
		const timestamp = nowIso();
		db.transaction(() => {
			db.prepare("DELETE FROM check_ins WHERE ticket_id=?").run(ticketId);
			db.prepare(
				"INSERT INTO takeout_events (request_id,ticket_id,device_id,status,payload_json,created_at,source_type,event_id,participant_id,operator_alias,operator_device_id,checked_in_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
			).run(
				requestId,
				ticketId,
				identity.deviceId,
				"REVERSED",
				payload.payload_json ?? null,
				timestamp,
				"json_sync",
				ticket?.event_id ?? null,
				ticket?.participant_id ?? null,
				identity.operatorAlias,
				identity.deviceId,
				timestamp,
			);
			if (ticket?.event_id)
				logEvent(db, ticket.event_id, "participant_checkin_reverted", {
					ticket_id: ticketId,
					request_id: requestId,
					event_id: ticket.event_id,
					source_type: "json_sync",
				});
		})();
		if (ticket?.event_id)
			broadcast(clients, ticket.event_id, {
				type: "participant_checkin_reverted",
				event_id: ticket.event_id,
				ticket_id: ticketId,
				request_id: requestId,
				source_type: "json_sync",
			});
		return json(res, 200, { status: "REVERSED" });
	});

	app.get("/audit", (req, res) => {
		const eventId = String(req.query.eventId ?? "").trim();
		if (!eventId) return error(res, 400, "eventId required");
		const status = req.query.status ? String(req.query.status) : null;
		const normal = db
			.prepare(
				`SELECT request_id,ticket_id,device_id,status,payload_json,created_at,source_type,event_id,participant_id,participant_name,birth_date,age_at_checkin,ticket_source_id,ticket_name,ticket_code,operator_alias,operator_device_id,checked_in_at FROM takeout_events WHERE event_id=? ${status ? "AND status=?" : ""} ORDER BY checked_in_at DESC`,
			)
			.all(...(status ? [eventId, status] : [eventId])) as Record<
			string,
			unknown
		>[];
		const legacy = db
			.prepare(
				`SELECT request_id, participant_id ticket_id, device_id,status,payload_json,created_at,source_type,event_id,participant_id,participant_name,birth_date,age_at_checkin,ticket_source_id,ticket_name,ticket_code,operator_alias,operator_device_id,checked_in_at FROM legacy_checkins WHERE event_id=? ${status ? "AND status=?" : ""} ORDER BY checked_in_at DESC`,
			)
			.all(...(status ? [eventId, status] : [eventId])) as Record<
			string,
			unknown
		>[];
		return json(
			res,
			200,
			[...normal, ...legacy].sort((a, b) =>
				String(b.checked_in_at ?? b.created_at).localeCompare(
					String(a.checked_in_at ?? a.created_at),
				),
			),
		);
	});

	app.post("/admin/import", upload.single("file"), (req, res) => {
		const lines = req.file
			? decodeUpload(req.file.buffer).split(/\r?\n/).filter(Boolean)
			: [];
		return json(res, 200, {
			imported: Math.max(0, lines.length - 1),
			errors: [],
		});
	});
	app.post("/sync/import", (req, res) => {
		const pull = req.body ?? {};
		const eventId = String(pull.eventId ?? pull.event?.id ?? "").trim();
		if (!eventId) return error(res, 400, "eventId is required");
		const event = pull.event ?? {};
		const participants = Array.isArray(pull.participants)
			? pull.participants
			: [];
		const importData = db.transaction(() => {
			db.prepare(
				"INSERT INTO events (event_id,name,start_date,end_date,start_time,imported_at,source_type,archived_at) VALUES (?,?,?,?,?,?,?,NULL) ON CONFLICT(event_id) DO UPDATE SET name=excluded.name,start_date=excluded.start_date,end_date=excluded.end_date,start_time=excluded.start_time,source_type=excluded.source_type",
			).run(
				eventId,
				event.name ?? event.title ?? eventId,
				event.startDate ?? null,
				event.endDate ?? null,
				event.startTime ?? null,
				nowIso(),
				"json_sync",
			);
			for (const item of participants as Array<Record<string, unknown>>) {
				const id = String(item.seatId ?? item.participantId ?? randomUUID());
				const ticketId = String(item.ticketId ?? item.id ?? id);
				const participantRaw = JSON.stringify({
					...item,
					participantName: item.participantName,
					customFormResponses: item.customFormResponses,
				});
				const ticketRaw = JSON.stringify(item);
				db.prepare(
					"INSERT INTO participants (id,event_id,name,cpf,birth_date,raw_json) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET event_id=excluded.event_id,name=excluded.name,cpf=excluded.cpf,birth_date=excluded.birth_date,raw_json=excluded.raw_json",
				).run(
					id,
					eventId,
					item.participantName ?? item.name ?? null,
					item.cpf ?? null,
					item.birthDate ?? null,
					participantRaw,
				);
				db.prepare(
					"INSERT INTO tickets (id,participant_id,code,raw_json) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET participant_id=excluded.participant_id,code=excluded.code,raw_json=excluded.raw_json",
				).run(ticketId, id, item.qrCode ?? ticketId, ticketRaw);
			}
			if (Array.isArray(pull.customForm))
				for (const definition of pull.customForm)
					db.prepare(
						"INSERT INTO custom_forms (event_id,definition_json) VALUES (?,?)",
					).run(eventId, JSON.stringify(definition));
		});
		importData();
		broadcast(clients, "_events", { type: "events_list_changed" });
		return json(res, 200, pull);
	});
	app.post("/admin/import/legacy-csv", upload.single("file"), (req, res) => {
		const eventName = String(req.body.eventName ?? "").trim();
		const eventStartDate = String(req.body.eventStartDate ?? "").trim();
		if (!eventName) return error(res, 400, "eventName is required");
		if (!eventStartDate) return error(res, 400, "eventStartDate is required");
		if (!req.file) return error(res, 400, "file is required");
		const eventId = String(req.body.eventId ?? randomUUID()).trim();
		let rows: ReturnType<typeof buildLegacyRows>;
		try {
			rows = buildLegacyRows(decodeUpload(req.file.buffer));
		} catch (caught) {
			return error(
				res,
				422,
				caught instanceof Error ? caught.message : "invalid CSV",
			);
		}
		const importRows = db.transaction(() => {
			const timestamp = nowIso();
			db.prepare(
				"INSERT INTO events (event_id,name,start_date,imported_at,source_type) VALUES (?,?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET name=excluded.name,start_date=excluded.start_date,source_type=excluded.source_type",
			).run(eventId, eventName, eventStartDate, timestamp, "legacy_csv");
			let imported = 0;
			for (const row of rows) {
				if (!row.name.trim()) continue;
				const id = randomUUID();
				db.prepare(
					"INSERT INTO legacy_participants (id,event_id,bib_number,full_name,sex,cpf_digits,birth_date_iso,modality,shirt_size,team,raw_json,created_at,updated_at,is_manual) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0)",
				).run(
					id,
					eventId,
					Number.isFinite(row.number) ? row.number : 0,
					row.name,
					row.sex || null,
					normalizeDigits(row.cpf),
					row.birthDate || "1900-01-01",
					row.modality || null,
					row.shirtSize || null,
					row.team || null,
					JSON.stringify(row),
					timestamp,
					timestamp,
				);
				imported += 1;
			}
			return imported;
		});
		const imported = importRows();
		broadcast(clients, "_events", { type: "events_list_changed" });
		return json(res, 200, { imported, errors: [] });
	});

	app.get("/events/:eventId/legacy-participants", (req, res) => {
		const rows = db
			.prepare(
				"SELECT * FROM legacy_participants WHERE event_id=? ORDER BY bib_number, full_name COLLATE NOCASE",
			)
			.all(req.params.eventId) as Record<string, unknown>[];
		return json(
			res,
			200,
			rows.map((row) => mapLegacyParticipant(db, row)),
		);
	});
	app.get("/events/:eventId/legacy-participants/search", (req, res) => {
		const query = String(req.query.q ?? "").trim();
		if (!query) return error(res, 400, "q is required");
		const mode = String(req.query.mode ?? "nome");
		const rows = db
			.prepare(
				"SELECT * FROM legacy_participants WHERE event_id=? ORDER BY bib_number",
			)
			.all(req.params.eventId) as Record<string, unknown>[];
		const result = rows.filter((row) => {
			const value =
				mode === "numero"
					? String(row.bib_number)
					: mode === "cpf"
						? String(row.cpf_digits)
						: mode === "birth_date"
							? String(row.birth_date_iso)
							: mode === "modality"
								? String(row.modality ?? "")
								: String(row.full_name);
			return (
				normalizeText(value).includes(normalizeText(query)) ||
				(mode === "cpf" &&
					normalizeDigits(value).includes(normalizeDigits(query)))
			);
		});
		return json(
			res,
			200,
			result.map((row) => mapLegacyParticipant(db, row)),
		);
	});
	app.get("/events/:eventId/legacy-reservations", (req, res) => {
		const sql = `SELECT * FROM legacy_reserved_numbers WHERE event_id=? ${parseBool(req.query.includeUsed) ? "" : "AND status='available'"} ORDER BY bib_number`;
		const rows = db.prepare(sql).all(req.params.eventId) as Array<
			Record<string, unknown>
		>;
		return json(
			res,
			200,
			rows.map((row) => ({
				eventId: row.event_id,
				bibNumber: row.bib_number,
				label: row.label,
				status: row.status,
				createdAt: row.created_at,
				usedAt: row.used_at,
				usedByParticipantId: row.used_by_participant_id,
			})),
		);
	});
	app.post("/events/:eventId/legacy-reservations", (req, res) => {
		const numbers = Array.isArray(req.body?.numbers) ? req.body.numbers : [];
		if (!numbers.length) return error(res, 400, "numbers is required");
		let created = 0;
		let skipped = 0;
		for (const item of numbers as Array<{
			bibNumber?: number;
			label?: string;
		}>) {
			const result = db
				.prepare(
					"INSERT OR IGNORE INTO legacy_reserved_numbers (event_id,bib_number,label,created_at) VALUES (?,?,?,?)",
				)
				.run(
					req.params.eventId,
					Number(item.bibNumber),
					item.label ?? null,
					nowIso(),
				);
			if (result.changes) created += 1;
			else skipped += 1;
		}
		return json(res, 200, { created, skipped, errors: [] });
	});
	app.post("/events/:eventId/legacy-participants", (req, res) => {
		const body = req.body ?? {};
		if (
			!body.reservationId ||
			!String(body.name ?? "").trim() ||
			!String(body.cpf ?? "").trim() ||
			!String(body.birthDate ?? "").trim() ||
			!String(body.ticketType ?? "").trim()
		)
			return error(
				res,
				400,
				"reservationId, name, cpf, birthDate and ticketType are required",
			);
		const reservation = db
			.prepare(
				"SELECT * FROM legacy_reserved_numbers WHERE event_id=? AND bib_number=?",
			)
			.get(req.params.eventId, Number(body.reservationId)) as
			| Record<string, unknown>
			| undefined;
		if (!reservation) return error(res, 404, "reservation not found");
		if (reservation.status !== "available")
			return error(res, 409, "reservation unavailable");
		const id = randomUUID();
		const timestamp = nowIso();
		db.transaction(() => {
			db.prepare(
				"INSERT INTO legacy_participants (id,event_id,bib_number,full_name,sex,cpf_digits,birth_date_iso,modality,shirt_size,team,raw_json,created_at,updated_at,is_manual) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)",
			).run(
				id,
				req.params.eventId,
				Number(body.reservationId),
				String(body.name).trim(),
				body.sex ?? null,
				normalizeDigits(String(body.cpf)),
				String(body.birthDate),
				body.ticketType,
				body.shirtSize ?? null,
				body.team ?? null,
				JSON.stringify(body),
				timestamp,
				timestamp,
			);
			db.prepare(
				"UPDATE legacy_reserved_numbers SET status='used',used_at=?,used_by_participant_id=? WHERE event_id=? AND bib_number=?",
			).run(timestamp, id, req.params.eventId, Number(body.reservationId));
		})();
		const row = db
			.prepare("SELECT * FROM legacy_participants WHERE id=?")
			.get(id) as Record<string, unknown>;
		broadcast(clients, req.params.eventId, {
			type: "participant_updated",
			event_id: req.params.eventId,
			participant_id: id,
			ticket_id: id,
			source_type: "legacy_csv",
		});
		return json(res, 200, mapLegacyParticipant(db, row));
	});
	app.put("/events/:eventId/legacy-participants/:participantId", (req, res) => {
		const body = req.body ?? {};
		const result = db
			.prepare(
				"UPDATE legacy_participants SET full_name=?,cpf_digits=?,birth_date_iso=?,modality=?,shirt_size=?,team=?,updated_at=? WHERE id=? AND event_id=? AND NOT EXISTS (SELECT 1 FROM legacy_checkins WHERE participant_id=? AND status='CONFIRMED')",
			)
			.run(
				String(body.name ?? "").trim(),
				normalizeDigits(String(body.cpf ?? "")),
				String(body.birthDate ?? ""),
				body.ticketType ?? null,
				body.shirtSize ?? null,
				body.team ?? null,
				nowIso(),
				req.params.participantId,
				req.params.eventId,
				req.params.participantId,
			);
		if (!result.changes)
			return error(res, 404, "participant not found or already checked in");
		const row = db
			.prepare("SELECT * FROM legacy_participants WHERE id=?")
			.get(req.params.participantId) as Record<string, unknown>;
		return json(res, 200, mapLegacyParticipant(db, row));
	});
	app.post("/takeout/confirm/legacy", (req, res) =>
		legacyCheckin(db, clients, req, res, false),
	);
	app.post("/takeout/undo/legacy", (req, res) =>
		legacyCheckin(db, clients, req, res, true),
	);

	app.post("/locks", (req, res) => {
		const participantId = String(req.body?.participantId ?? "");
		const deviceId = String(req.body?.deviceId ?? "");
		const expires = nowEpoch() + 30;
		const current = db
			.prepare("SELECT device_id,expires_at FROM locks WHERE participant_id=?")
			.get(participantId) as
			| { device_id: string; expires_at: number }
			| undefined;
		if (
			current &&
			current.expires_at > nowEpoch() &&
			current.device_id !== deviceId
		)
			return json(res, 409, { acquired: false, heldBy: current.device_id });
		db.prepare(
			"INSERT INTO locks (participant_id,device_id,expires_at) VALUES (?,?,?) ON CONFLICT(participant_id) DO UPDATE SET device_id=excluded.device_id,expires_at=excluded.expires_at",
		).run(participantId, deviceId, expires);
		return json(res, 200, { acquired: true });
	});
	app.post("/locks/renew", (req, res) => {
		const result = db
			.prepare(
				"UPDATE locks SET expires_at=? WHERE participant_id=? AND device_id=?",
			)
			.run(
				nowEpoch() + 30,
				String(req.body?.participantId ?? ""),
				String(req.body?.deviceId ?? ""),
			);
		return json(res, result.changes ? 200 : 409, {
			renewed: result.changes > 0,
		});
	});
	app.get("/locks/:participantId", (req, res) => {
		const row = db
			.prepare(
				"SELECT device_id,expires_at FROM locks WHERE participant_id=? AND expires_at>? ",
			)
			.get(req.params.participantId, nowEpoch()) as
			| { device_id: string; expires_at: number }
			| undefined;
		return json(res, 200, {
			heldBy: row?.device_id ?? null,
			expiresAt: row?.expires_at ?? null,
		});
	});
	app.delete("/locks/:participantId", (req, res) => {
		const deviceId = req.query.deviceId ? String(req.query.deviceId) : null;
		const result = deviceId
			? db
					.prepare("DELETE FROM locks WHERE participant_id=? AND device_id=?")
					.run(req.params.participantId, deviceId)
			: db
					.prepare("DELETE FROM locks WHERE participant_id=?")
					.run(req.params.participantId);
		return json(res, 200, { released: result.changes > 0 });
	});
	app.get("/sync/events", (req, res) => {
		const eventId = String(req.query.eventId ?? "");
		const since = Number(req.query.sinceSeq ?? 0);
		const events = db
			.prepare(
				"SELECT seq,event_id eventId,type,payload_json payloadJson,created_at createdAt FROM event_log WHERE event_id=? AND seq>? ORDER BY seq",
			)
			.all(eventId, since);
		const latest = db
			.prepare(
				"SELECT COALESCE(MAX(seq),0) latestSeq FROM event_log WHERE event_id=?",
			)
			.get(eventId) as { latestSeq: number };
		return json(res, 200, { events, latestSeq: latest.latestSeq });
	});
	app.get("/sync/pull", (_req, res) =>
		error(res, 503, "sync unavailable while offline"),
	);
	app.post("/sync/push", (_req, res) =>
		error(res, 503, "sync unavailable while offline"),
	);

	httpServer.on("upgrade", (request, socket, head) => {
		const url = new URL(
			request.url ?? "/",
			`http://${request.headers.host ?? "127.0.0.1"}`,
		);
		if (url.pathname !== "/ws") {
			socket.destroy();
			return;
		}
		const eventId = url.searchParams.get("event_id") ?? "_events";
		wsServer.handleUpgrade(request, socket, head, (client) => {
			wsServer.emit("connection", client, request, eventId);
		});
	});
	wsServer.on("connection", (client: WebSocket, _request, eventId: string) => {
		const eventClients = clients.get(eventId) ?? new Set<WebSocket>();
		eventClients.add(client);
		clients.set(eventId, eventClients);
		const lastSeq = Number(
			new URL(
				_request.url ?? "/",
				`http://${_request.headers.host ?? "127.0.0.1"}`,
			).searchParams.get("last_seq") ?? 0,
		);
		if (lastSeq > 0) {
			const replay = db
				.prepare(
					"SELECT seq,type,event_id,payload_json,created_at FROM event_log WHERE event_id=? AND seq>? ORDER BY seq",
				)
				.all(eventId, lastSeq) as Array<{
				seq: number;
				type: string;
				event_id: string;
				payload_json: string | null;
				created_at: number;
			}>;
			for (const item of replay)
				client.send(
					JSON.stringify({
						type: item.type,
						event_id: item.event_id,
						seq: item.seq,
						created_at: item.created_at,
						...safeJson(item.payload_json),
					}),
				);
		}
		const heartbeat = setInterval(() => {
			if (client.readyState === WebSocket.OPEN)
				client.send(JSON.stringify({ type: "heartbeat", sentAt: Date.now() }));
		}, 30_000);
		client.on("close", () => {
			clearInterval(heartbeat);
			eventClients.delete(client);
			if (eventClients.size === 0) clients.delete(eventId);
		});
	});

	return {
		app,
		httpServer,
		wsServer,
		close: async () => {
			for (const sockets of clients.values())
				for (const socket of sockets) socket.close();
			wsServer.close();
			await new Promise<void>((resolve) => httpServer.close(() => resolve()));
			db.close();
		},
	};
}

function legacyCheckin(
	db: SqliteDatabase,
	clients: Map<string, Set<WebSocket>>,
	req: Request,
	res: Response,
	undo: boolean,
): Response {
	const payload = req.body ?? {};
	const requestId = String(payload.request_id ?? "").trim();
	const eventId = String(payload.event_id ?? "").trim();
	const participantId = String(payload.participant_id ?? "").trim();
	if (!requestId || !eventId || !participantId)
		return error(
			res,
			400,
			"request_id, event_id and participant_id are required",
		);
	if (
		db
			.prepare("SELECT 1 FROM legacy_checkins WHERE request_id=?")
			.get(requestId)
	)
		return json(res, 200, { status: "DUPLICATE" });
	const identity = getIdentity(db, req, String(payload.device_id ?? "desktop"));
	const existing = db
		.prepare(
			"SELECT request_id FROM legacy_checkins WHERE event_id=? AND participant_id=? AND status='CONFIRMED'",
		)
		.get(eventId, participantId) as { request_id: string } | undefined;
	if (!undo && existing)
		return json(res, 409, {
			status: "CONFLICT",
			existing_request_id: existing.request_id,
			participant_id: participantId,
		});
	if (undo && !existing)
		return error(res, 409, "participant not checked in", "FAILED");
	const participant = db
		.prepare(
			"SELECT full_name,birth_date_iso FROM legacy_participants WHERE id=? AND event_id=?",
		)
		.get(participantId, eventId) as
		| { full_name: string; birth_date_iso: string }
		| undefined;
	if (!participant) return error(res, 404, "participant not found");
	const timestamp = nowIso();
	const status = undo ? "REVERSED" : "CONFIRMED";
	db.transaction(() => {
		if (undo)
			db.prepare(
				"UPDATE legacy_checkins SET status='REVERSED' WHERE request_id=?",
			).run(existing?.request_id);
		db.prepare(
			"INSERT INTO legacy_checkins (request_id,event_id,participant_id,device_id,status,payload_json,created_at,source_type,participant_name,birth_date,age_at_checkin,operator_alias,operator_device_id,checked_in_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
		).run(
			requestId,
			eventId,
			participantId,
			identity.deviceId,
			status,
			payload.payload_json ?? null,
			timestamp,
			"legacy_csv",
			participant.full_name,
			participant.birth_date_iso,
			computeAge(participant.birth_date_iso),
			identity.operatorAlias,
			identity.deviceId,
			timestamp,
		);
		logEvent(
			db,
			eventId,
			undo ? "participant_checkin_reverted" : "participant_checked_in",
			{
				participant_id: participantId,
				request_id: requestId,
				event_id: eventId,
				source_type: "legacy_csv",
			},
		);
	})();
	broadcast(clients, eventId, {
		type: undo ? "participant_checkin_reverted" : "participant_checked_in",
		event_id: eventId,
		participant_id: participantId,
		request_id: requestId,
		source_type: "legacy_csv",
	});
	return json(res, 200, { status });
}

export async function startTakeoutServer(
	server: TakeoutServer,
	port = PORT,
): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.httpServer.once("error", reject);
		server.httpServer.listen(port, "0.0.0.0", () => resolve());
	});
}

export const TAKEOUT_PORT = PORT;
