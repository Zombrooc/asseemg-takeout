import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventParticipant, EventSummary, LegacyEventParticipant } from "../src/renderer/src/api";
import {
	buildParticipantExportRows,
	buildParticipantsCsv,
	buildParticipantsFilename,
	exportParticipants,
} from "../src/renderer/src/participant-export";

vi.mock("xlsx", () => ({
	utils: {
		aoa_to_sheet: (rows: unknown[][]) => ({ rows }),
		encode_cell: ({ r, c }: { r: number; c: number }) => `${r}:${c}`,
		book_new: () => ({ sheets: [] }),
		book_append_sheet: (workbook: { sheets: unknown[] }, sheet: unknown, name: string) => {
			workbook.sheets.push({ sheet, name });
		},
	},
	write: () => "xlsx-base64",
}));

const event: EventSummary = {
	eventId: "event-1",
	name: "Corrida São Paulo",
	startDate: "2026-09-20",
	endDate: null,
	startTime: "07:00",
	importedAt: "2026-09-01T10:00:00Z",
	sourceType: "json_sync",
};

const synchronizedParticipant: EventParticipant = {
	id: "participant-1",
	name: "Ana Souza",
	cpf: "01234567890",
	birthDate: "2000-03-08",
	sex: "Feminino",
	shirtSize: "M",
	team: "Equipe Azul",
	ticketId: "seat-1",
	sourceTicketId: "ticket-1",
	ticketName: "10K",
	qrCode: "qr-1",
	checkinDone: true,
	bibNumber: 12,
	customFormResponses: [
		{ name: "cidade", label: "Cidade", type: "text", response: "São Paulo" },
		{ name: "idade", label: "Idade informada", type: "number", response: 26 },
	],
};

const legacyParticipant: LegacyEventParticipant = {
	id: "legacy-1",
	bibNumber: 13,
	name: "Bruno Lima",
	sex: "Masculino",
	cpf: "98765432100",
	birthDate: "08/03/1990",
	modality: "5KM",
	shirtSize: "G",
	team: "Equipe Verde",
	qrCode: "legacy-qr-1",
	checkinDone: false,
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("participant export", () => {
	it("exports every participant as CSV with direct custom columns and ISO dates", () => {
		const csv = buildParticipantsCsv([synchronizedParticipant, legacyParticipant], event);
		const lines = csv.replace(/^\uFEFF/, "").split("\r\n");
		const { columns } = buildParticipantExportRows([synchronizedParticipant, legacyParticipant], event);
		const headers = columns.map((column) => column.header);

		expect(headers).not.toEqual(expect.arrayContaining([
			"ID do Evento",
			"Evento",
			"Origem",
			"ID do Participante",
			"ID do Ticket",
			"ID Original do Ticket",
		]));
		expect(lines[0]).toContain('"Nome Completo"');
		expect(lines[0]).toContain('"Cidade"');
		expect(lines[0]).toContain('"Idade informada"');
		expect(lines[1]).toContain('"01234567890"');
		expect(lines[1]).toContain('"2000-03-08"');
		expect(lines[2]).toContain('"1990-03-08"');
		expect(lines[2]).toContain('"Bruno Lima"');
	});

	it("normalizes birth dates as date values before XLSX serialization", () => {
		const { columns, rows } = buildParticipantExportRows([synchronizedParticipant], event);
		const birthDateColumn = columns.findIndex((column) => column.header === "Data de Nascimento");
		const dateCell = rows[0][birthDateColumn];

		expect(dateCell).toBeInstanceOf(Date);
		expect((dateCell as Date).toISOString().slice(0, 10)).toBe("2000-03-08");
	});

	it("uses a sanitized filename with the requested extension", () => {
		expect(buildParticipantsFilename(event, "xlsx", "2026-10-20")).toBe(
			"participantes-Corrida-Sao-Paulo-2026-10-20.xlsx",
		);
	});

	it("saves through the Electron bridge and reports cancellation", async () => {
		const saveFile = vi.fn().mockResolvedValue({ saved: true, path: "C:/exports/participants.csv" });
		vi.stubGlobal("window", { desktopWindow: { saveFile } });

		await expect(exportParticipants([synchronizedParticipant], event, "csv", "2026-10-20")).resolves.toEqual({
			status: "saved",
			count: 1,
			path: "C:/exports/participants.csv",
		});
		expect(saveFile).toHaveBeenCalledWith(expect.objectContaining({
			defaultPath: "participantes-Corrida-Sao-Paulo-2026-10-20.csv",
			base64: expect.any(String),
		}));

		saveFile.mockResolvedValue({ saved: false, path: "" });
		await expect(exportParticipants([synchronizedParticipant], event, "xlsx")).resolves.toMatchObject({
			status: "cancelled",
			count: 1,
		});
	});
});
