import type { EventParticipant, EventSummary, LegacyEventParticipant } from "./api";

export type DesktopParticipant = EventParticipant | LegacyEventParticipant;
export type ParticipantExportFormat = "csv" | "xlsx";

export type ParticipantExportResult =
	| { status: "saved"; count: number; path: string }
	| { status: "cancelled"; count: number };

type ExportCell = string | number | boolean | null | Date;

type ExportColumn = {
	key: string;
	header: string;
	date?: boolean;
	getValue: (participant: DesktopParticipant, event: EventSummary) => ExportCell;
};

const STANDARD_FIELD_KEYS = new Set([
	"eventid",
	"eventname",
	"sourcetype",
	"participantid",
	"name",
	"nome",
	"nomecompleto",
	"cpf",
	"birthdate",
	"datanascimento",
	"sex",
	"sexo",
	"bibnumber",
	"numero",
	"tickettype",
	"ticketname",
	"modalidade",
	"ticketsourceid",
	"ticketid",
	"qrcode",
	"shirtsize",
	"tamanhodacamisa",
	"team",
	"equipe",
	"checkindone",
]);

function normalizeKey(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "");
}

function valueAsText(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return JSON.stringify(value);
}

function getBirthDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	const trimmed = value.trim();
	const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
	const brazilian = /^(\d{1,2})[\\/.-](\d{1,2})[\\/.-](\d{4})/.exec(trimmed);
	const year = iso ? Number(iso[1]) : brazilian ? Number(brazilian[3]) : Number.NaN;
	const month = iso ? Number(iso[2]) : brazilian ? Number(brazilian[2]) : Number.NaN;
	const day = iso ? Number(iso[3]) : brazilian ? Number(brazilian[1]) : Number.NaN;
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

	// Use UTC so the date-only value cannot move one day when the workbook is read
	// by a machine in another timezone.
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
		? date
		: null;
}

function getStandardValue(participant: DesktopParticipant, key: string): ExportCell {
	if (key === "name") return "name" in participant ? participant.name : "";
	if (key === "cpf") return participant.cpf;
	if (key === "birthDate") return getBirthDate(participant.birthDate);
	if (key === "sex") return "sex" in participant ? participant.sex ?? "" : "";
	if (key === "bibNumber") return "bibNumber" in participant ? participant.bibNumber ?? "" : "";
	if (key === "ticketType") return "modality" in participant ? participant.modality ?? "" : (participant as EventParticipant).ticketName ?? "";
	if (key === "ticketSourceId") return "sourceTicketId" in participant ? participant.sourceTicketId ?? "" : "";
	if (key === "ticketId") return "ticketId" in participant ? participant.ticketId : participant.id;
	if (key === "qrCode") return participant.qrCode ?? "";
	if (key === "shirtSize") return participant.shirtSize ?? "";
	if (key === "team") return participant.team ?? "";
	if (key === "checkinDone") return participant.checkinDone ? "Confirmado" : "Pendente";
	return "";
}

function standardColumns(): ExportColumn[] {
	return [
		{ key: "name", header: "Nome Completo", getValue: (participant) => getStandardValue(participant, "name") },
		{ key: "cpf", header: "CPF", getValue: (participant) => getStandardValue(participant, "cpf") },
		{ key: "birthDate", header: "Data de Nascimento", date: true, getValue: (participant) => getStandardValue(participant, "birthDate") },
		{ key: "sex", header: "Sexo", getValue: (participant) => getStandardValue(participant, "sex") },
		{ key: "bibNumber", header: "Número", getValue: (participant) => getStandardValue(participant, "bibNumber") },
		{ key: "ticketType", header: "Modalidade / Tipo de Ingresso", getValue: (participant) => getStandardValue(participant, "ticketType") },
		{ key: "shirtSize", header: "Tamanho da Camisa", getValue: (participant) => getStandardValue(participant, "shirtSize") },
		{ key: "team", header: "Equipe", getValue: (participant) => getStandardValue(participant, "team") },
		{ key: "qrCode", header: "QR Code", getValue: (participant) => getStandardValue(participant, "qrCode") },
		{ key: "checkinDone", header: "Status da Retirada", getValue: (participant) => getStandardValue(participant, "checkinDone") },
	];
}

function customColumns(participants: DesktopParticipant[], columns: ExportColumn[]): ExportColumn[] {
	const seen = new Set(columns.flatMap((column) => [normalizeKey(column.key), normalizeKey(column.header)]));
	const fields = new Map<string, string>();
	for (const participant of participants) {
		if (!("customFormResponses" in participant) || !participant.customFormResponses) continue;
		for (const field of participant.customFormResponses) {
			const rawKey = field.name.trim() || field.label.trim();
			const key = normalizeKey(rawKey);
			if (!key || STANDARD_FIELD_KEYS.has(key) || fields.has(key)) continue;
			fields.set(key, field.label.trim() || field.name.trim() || `Campo adicional ${fields.size + 1}`);
		}
	}

	return Array.from(fields, ([key, header]) => {
		let uniqueHeader = header;
		let suffix = 2;
		while (seen.has(normalizeKey(uniqueHeader))) uniqueHeader = `${header} (${suffix++})`;
		seen.add(normalizeKey(uniqueHeader));
		return {
			key: `custom:${key}`,
			header: uniqueHeader,
			getValue: (participant: DesktopParticipant) => {
				if (!("customFormResponses" in participant) || !participant.customFormResponses) return "";
				const response = participant.customFormResponses.find((field) => normalizeKey(field.name || field.label) === key);
				return valueAsText(response?.response);
			},
		};
	});
}

export function buildParticipantExportColumns(participants: DesktopParticipant[]): ExportColumn[] {
	const standard = standardColumns();
	return [...standard, ...customColumns(participants, standard)];
}

export function buildParticipantExportRows(
	participants: DesktopParticipant[],
	event: EventSummary,
): { columns: ExportColumn[]; rows: ExportCell[][] } {
	const columns = buildParticipantExportColumns(participants);
	return {
		columns,
		rows: participants.map((participant) => columns.map((column) => column.getValue(participant, event))),
	};
}

function csvEscape(value: ExportCell): string {
	const text = value instanceof Date ? formatIsoDate(value) : valueAsText(value);
	return `"${text.replace(/"/g, '""')}"`;
}

function formatIsoDate(value: Date): string {
	return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

export function buildParticipantsCsv(participants: DesktopParticipant[], event: EventSummary): string {
	const { columns, rows } = buildParticipantExportRows(participants, event);
	const content = [columns.map((column) => csvEscape(column.header)).join(";"), ...rows.map((row) => row.map(csvEscape).join(";"))].join("\r\n");
	return `\uFEFF${content}\r\n`;
}

export async function buildParticipantsXlsxBase64(participants: DesktopParticipant[], event: EventSummary): Promise<string> {
	const XLSX = await import("xlsx");
	const { columns, rows } = buildParticipantExportRows(participants, event);
	const sheet = XLSX.utils.aoa_to_sheet([columns.map((column) => column.header), ...rows.map((row) => row.map((value) => value instanceof Date ? null : typeof value === "number" || typeof value === "boolean" ? value : valueAsText(value)))]);
	for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
		for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
			const value = rows[rowIndex][columnIndex];
			if (!(value instanceof Date)) continue;
			const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
			sheet[address] = { t: "d", v: value, z: "dd/mm/yyyy" };
		}
	}
	sheet["!cols"] = columns.map((column) => ({ wch: Math.min(Math.max(column.header.length + 2, 14), 36) }));
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, sheet, "Participantes");
	return XLSX.write(workbook, { bookType: "xlsx", type: "base64", cellDates: true });
}

function sanitizeFilenamePart(value: string): string {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "evento";
}

function encodeUtf8Base64(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return btoa(binary);
}

export { encodeUtf8Base64 };

export function buildParticipantsFilename(event: EventSummary, format: ParticipantExportFormat, date = new Date().toISOString().slice(0, 10)): string {
	return `participantes-${sanitizeFilenamePart(event.name ?? event.eventId)}-${date}.${format}`;
}

export async function exportParticipants(
	participants: DesktopParticipant[],
	event: EventSummary,
	format: ParticipantExportFormat,
	date?: string,
): Promise<ParticipantExportResult> {
	if (participants.length === 0) throw new Error("Nenhum participante para exportar.");
	const data = await generateExportBase64(participants, event, format);
	const result = await window.desktopWindow.saveFile({
		defaultPath: buildParticipantsFilename(event, format, date),
		filters: [{ name: format.toUpperCase(), extensions: [format] }],
		base64: data,
	});
	return result.saved ? { status: "saved", count: participants.length, path: result.path } : { status: "cancelled", count: participants.length };
}

async function generateExportBase64(
	participants: DesktopParticipant[],
	event: EventSummary,
	format: ParticipantExportFormat,
): Promise<string> {
	if (typeof Worker === "undefined") return generateExportBase64OnMainThread(participants, event, format);

	return new Promise<string>((resolve, reject) => {
		const worker = new Worker(new URL("./participant-export.worker.ts", import.meta.url), { type: "module" });
		worker.onmessage = (message: MessageEvent<{ ok: boolean; data?: string; error?: string }>) => {
			worker.terminate();
			if (message.data.ok && message.data.data) resolve(message.data.data);
			else reject(new Error(message.data.error ?? "Falha ao gerar exportação"));
		};
		worker.onerror = (error) => {
			worker.terminate();
			reject(error.error instanceof Error ? error.error : new Error(error.message));
		};
		worker.postMessage({ participants, event, format });
	});
}

async function generateExportBase64OnMainThread(
	participants: DesktopParticipant[],
	event: EventSummary,
	format: ParticipantExportFormat,
): Promise<string> {
	return format === "csv"
		? encodeUtf8Base64(buildParticipantsCsv(participants, event))
		: buildParticipantsXlsxBase64(participants, event);
}
