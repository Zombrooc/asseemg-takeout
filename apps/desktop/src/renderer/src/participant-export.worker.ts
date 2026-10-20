import {
	buildParticipantsCsv,
	buildParticipantsXlsxBase64,
	encodeUtf8Base64,
	type DesktopParticipant,
	type ParticipantExportFormat,
} from "./participant-export";
import type { EventSummary } from "./api";

type ExportMessage = {
	participants: DesktopParticipant[];
	event: EventSummary;
	format: ParticipantExportFormat;
};

self.onmessage = async (message: MessageEvent<ExportMessage>) => {
	try {
		const { participants, event, format } = message.data;
		const data = format === "csv"
			? encodeUtf8Base64(buildParticipantsCsv(participants, event))
			: await buildParticipantsXlsxBase64(participants, event);
		self.postMessage({ ok: true, data });
	} catch (caught) {
		self.postMessage({
			ok: false,
			error: caught instanceof Error ? caught.message : "Falha ao gerar exportação",
		});
	}
};
