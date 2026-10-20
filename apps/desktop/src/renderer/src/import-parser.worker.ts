import { autoMap, decodeCsv, parseCsv, type Mapping, type ParsedCsv } from "./import-utils";

type ParseMessage =
	| { mode: "csv"; buffer: ArrayBuffer }
	| { mode: "json"; text: string };

self.onmessage = (message: MessageEvent<ParseMessage>) => {
	try {
		if (message.data.mode === "csv") {
			const parsed: ParsedCsv = parseCsv(decodeCsv(message.data.buffer));
			const mapping: Mapping = autoMap(parsed.headers);
			self.postMessage({ ok: true, mode: "csv", parsed, mapping });
			return;
		}

		const parsed = JSON.parse(message.data.text) as Record<string, unknown>;
		if (!Array.isArray(parsed.participants))
			throw new Error("O JSON não contém uma lista de participantes válida");
		self.postMessage({ ok: true, mode: "json", parsed });
	} catch (caught) {
		self.postMessage({
			ok: false,
			error: caught instanceof Error ? caught.message : "Arquivo inválido",
		});
	}
};
