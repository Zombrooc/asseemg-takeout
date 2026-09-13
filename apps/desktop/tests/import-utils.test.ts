import { describe, expect, it } from "vitest";
import { autoMap, buildMappedCsv, getImportSteps, mappingIsValid, mapRows, parseCsv } from "../src/renderer/src/import-utils";

describe("desktop import utils", () => {
	it("uses a mapping step only for CSV imports", () => {
		expect(getImportSteps("csv")).toHaveLength(3);
		expect(getImportSteps("json")).toEqual(["Dados do evento", "Upload do arquivo"]);
	});

	it("parses semicolon CSV and auto-maps accented headers", () => {
		const parsed = parseCsv("N\u00famero;Nome Completo;CPF\n12;Ana;123\n");
		const mapping = autoMap(parsed.headers);
		expect(mappingIsValid(mapping)).toBe(true);
		expect(mapRows(parsed.rows, mapping)[0].fullName).toBe("Ana");
	});

	it("supports columns in arbitrary order and omits number-only rows", () => {
		const parsed = parseCsv("Nome;N\u00famero\nAna;1\n;2\n");
		const mapping = autoMap(parsed.headers);
		expect(mapRows(parsed.rows, mapping)).toHaveLength(1);
		expect(buildMappedCsv(parsed.rows, mapping)).toContain('"1","Ana"');
	});

	it("maps and preserves the optional qrcode column", () => {
		const parsed = parseCsv("Nome;N\u00famero;QR Code\nAna;1;ticket-qr-001\n");
		const mapping = autoMap(parsed.headers);

		expect(mapping.qrcode).toBe(2);
		expect(mapRows(parsed.rows, mapping)[0].qrcode).toBe("ticket-qr-001");
		expect(buildMappedCsv(parsed.rows, mapping)).toContain('"ticket-qr-001"');
	});

	it("rejects mappings without required fields", () => {
		const mapping = autoMap(["CPF"]);
		expect(mappingIsValid(mapping)).toBe(false);
	});
});
