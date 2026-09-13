export type ImportMode = "csv" | "json";

export type ParsedCsv = { headers: string[]; rows: string[][] };
export type LegacyFieldKey =
	| "number"
	| "fullName"
	| "cpf"
	| "birthDate"
	| "sex"
	| "modality"
	| "shirtSize"
	| "team"
	| "qrcode";

export const LEGACY_FIELDS: Array<{ key: LegacyFieldKey; label: string; required: boolean }> = [
	{ key: "number", label: "Número", required: true },
	{ key: "fullName", label: "Nome completo", required: true },
	{ key: "cpf", label: "CPF", required: false },
	{ key: "birthDate", label: "Data de nascimento", required: false },
	{ key: "sex", label: "Sexo", required: false },
	{ key: "modality", label: "Modalidade", required: false },
	{ key: "shirtSize", label: "Tamanho da camisa", required: false },
	{ key: "team", label: "Equipe", required: false },
	{ key: "qrcode", label: "QR Code", required: false },
];

const ALIASES: Record<LegacyFieldKey, string[]> = {
	number: ["numero", "bib", "bib number", "bib_number", "numero atleta"],
	fullName: ["nome completo", "nome", "nome do participante", "participante", "name"],
	cpf: ["cpf", "documento", "documento cpf"],
	birthDate: ["data de nascimento", "nascimento", "birth date", "data nascimento", "data_nascimento"],
	sex: ["sexo", "genero", "gender"],
	modality: ["modalidade", "categoria", "prova", "race", "categoria ticket"],
	shirtSize: ["tamanho da camisa", "tamanho camisa", "camisa", "shirt size"],
	team: ["equipe", "time", "assessoria", "team"],
	qrcode: ["qrcode", "qr code", "codigo qr", "codigo do qr", "qr"],
};

function repair(value: string): string {
	let current = value;
	for (let pass = 0; pass < 3; pass += 1) {
		const bytes = new Uint8Array(current.length);
		let valid = true;
		for (let i = 0; i < current.length; i += 1) {
			if (current.charCodeAt(i) > 255) { valid = false; break; }
			bytes[i] = current.charCodeAt(i);
		}
		if (!valid) break;
		try {
			const next = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
			const score = (text: string) => (text.match(/[ÃÂ�]/g) ?? []).length;
			if (next === current || score(next) >= score(current)) break;
			current = next;
		} catch { break; }
	}
	return current.trim();
}

export function decodeCsv(buffer: ArrayBuffer): string {
	const utf8 = new TextDecoder("utf-8").decode(buffer);
	return repair(utf8.includes("\uFFFD") ? new TextDecoder("windows-1252").decode(buffer) : utf8);
}

function normalizeHeader(value: string): string {
	return repair(value).replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function parseLine(line: string, delimiter: "," | ";"): string[] {
	const cells: string[] = [];
	let cell = "";
	let quoted = false;
	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];
		if (char === '"') {
			if (quoted && line[i + 1] === '"') { cell += '"'; i += 1; }
			else quoted = !quoted;
		} else if (char === delimiter && !quoted) { cells.push(repair(cell)); cell = ""; }
		else cell += char;
	}
	cells.push(repair(cell));
	return cells;
}

export function parseCsv(content: string): ParsedCsv {
	const lines = repair(content).split(/\r?\n/).filter((line) => line.trim());
	if (lines.length < 2) throw new Error("CSV vazio");
	const delimiter = parseLine(lines[0], ";").length > parseLine(lines[0], ",").length ? ";" : ",";
	return { headers: parseLine(lines[0], delimiter), rows: lines.slice(1).map((line) => parseLine(line, delimiter)).filter((row) => row.some(Boolean)) };
}

export type Mapping = Record<LegacyFieldKey, number | null>;
export function autoMap(headers: string[]): Mapping {
	const normalized = headers.map(normalizeHeader);
	const taken = new Set<number>();
	return Object.fromEntries(LEGACY_FIELDS.map(({ key }) => {
		const aliases = new Set(ALIASES[key].map(normalizeHeader));
		const index = normalized.findIndex((header, i) => !taken.has(i) && aliases.has(header));
		if (index >= 0) taken.add(index);
		return [key, index >= 0 ? index : null];
	})) as Mapping;
}

export function mappingIsValid(mapping: Mapping): boolean {
	const required = LEGACY_FIELDS.filter((field) => field.required).map((field) => mapping[field.key]);
	return required.every((value) => value != null) && new Set(required).size === required.length;
}

export function mapRows(rows: string[][], mapping: Mapping): Array<Record<LegacyFieldKey, string>> {
	return rows.map((row) => Object.fromEntries(LEGACY_FIELDS.map(({ key }) => [key, mapping[key] == null ? "" : repair(row[mapping[key]!] ?? "")])) as Record<LegacyFieldKey, string>)
		.filter((row) => Object.entries(row).some(([key, value]) => key !== "number" && value.trim()));
}

function csvEscape(value: string): string { return `"${value.replaceAll('"', '""')}"`; }
export function buildMappedCsv(rows: string[][], mapping: Mapping): string {
	const header = LEGACY_FIELDS.map((field) => csvEscape(field.label)).join(",");
	return [header, ...mapRows(rows, mapping).map((row) => LEGACY_FIELDS.map((field) => csvEscape(row[field.key])).join(","))].join("\n");
}
