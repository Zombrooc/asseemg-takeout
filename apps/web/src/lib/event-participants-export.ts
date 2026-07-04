import type { EventParticipant } from "@/lib/takeout-api";

export type ExportFormat = "csv" | "json";
export type EventSourceType = "json_sync" | "legacy_csv";

export type EventParticipantExportRecord = {
  eventId: string;
  eventName: string;
  sourceType: EventSourceType;
  participantId: string;
  name: string | null;
  cpf: string | null;
  birthDate: string | null;
  ticketId: string;
  sourceTicketId: string | null;
  ticketType: string | null;
  qrCode: string;
  bibNumber: number | null;
  shirtSize: string | null;
  team: string | null;
  sex: string | null;
  checkinDone: boolean;
  customFormResponses: EventParticipant["customFormResponses"] | null;
};

export type ExportParticipantsResult =
  | { status: "saved"; count: number; path: string }
  | { status: "downloaded"; count: number }
  | { status: "cancelled"; count: number };

type ExportEventParticipantsParams = {
  eventId: string;
  eventName: string;
  participants: EventParticipant[];
  sourceType: EventSourceType;
  format: ExportFormat;
  date?: string;
};

const CSV_COLUMNS = [
  "eventId",
  "eventName",
  "sourceType",
  "participantId",
  "name",
  "cpf",
  "birthDate",
  "ticketId",
  "sourceTicketId",
  "ticketType",
  "qrCode",
  "bibNumber",
  "shirtSize",
  "team",
  "sex",
  "checkinDone",
  "customFormResponses",
] as const;

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

function sanitizeFilenamePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "evento";
}

function normalizeString(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value;
}

function resolveParticipantSex(participant: EventParticipant): string | null {
  if (participant.sex != null && participant.sex.trim() !== "") {
    return participant.sex;
  }

  const response = participant.customFormResponses?.find((item) => {
    const name = item.name.trim().toLowerCase();
    const label = item.label.trim().toLowerCase();
    return name === "sexo" || name === "sex" || label === "sexo" || label === "sex";
  });
  if (response == null) return null;
  if (typeof response.response === "string") {
    return response.response.trim() || null;
  }
  if (response.response == null) return null;
  return String(response.response);
}

export function buildEventParticipantExportRecords(
  participants: EventParticipant[],
  metadata: Omit<ExportEventParticipantsParams, "participants" | "format" | "date">
): EventParticipantExportRecord[] {
  return participants.map((participant) => ({
    eventId: metadata.eventId,
    eventName: metadata.eventName,
    sourceType: metadata.sourceType,
    participantId: participant.id,
    name: normalizeString(participant.name),
    cpf: normalizeString(participant.cpf),
    birthDate: normalizeString(participant.birthDate),
    ticketId: participant.ticketId,
    sourceTicketId: normalizeString(participant.sourceTicketId),
    ticketType: normalizeString(participant.ticketName),
    qrCode: participant.qrCode,
    bibNumber: participant.bibNumber ?? null,
    shirtSize: normalizeString(participant.shirtSize),
    team: normalizeString(participant.team),
    sex: resolveParticipantSex(participant),
    checkinDone: participant.checkinDone,
    customFormResponses: participant.customFormResponses ?? null,
  }));
}

export function buildEventParticipantsCsv(records: EventParticipantExportRecord[]): string {
  const header = CSV_COLUMNS.map(csvEscape).join(",");
  const rows = records.map((record) =>
    [
      record.eventId,
      record.eventName,
      record.sourceType,
      record.participantId,
      record.name ?? "",
      record.cpf ?? "",
      record.birthDate ?? "",
      record.ticketId,
      record.sourceTicketId ?? "",
      record.ticketType ?? "",
      record.qrCode,
      record.bibNumber ?? "",
      record.shirtSize ?? "",
      record.team ?? "",
      record.sex ?? "",
      record.checkinDone ? "true" : "false",
      JSON.stringify(record.customFormResponses ?? null),
    ]
      .map(csvEscape)
      .join(",")
  );

  return [header, ...rows].join("\n");
}

export function buildEventParticipantsFilename(
  eventId: string,
  format: ExportFormat,
  date = new Date().toISOString().slice(0, 10)
): string {
  return `participantes-${sanitizeFilenamePart(eventId)}-${date}.${format}`;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function downloadWithBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportEventParticipantsFile(
  params: ExportEventParticipantsParams
): Promise<ExportParticipantsResult> {
  const records = buildEventParticipantExportRecords(params.participants, {
    eventId: params.eventId,
    eventName: params.eventName,
    sourceType: params.sourceType,
  });
  const filename = buildEventParticipantsFilename(params.eventId, params.format, params.date);
  const content =
    params.format === "csv" ? buildEventParticipantsCsv(records) : JSON.stringify(records, null, 2);
  const mimeType =
    params.format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";

  if (isTauriRuntime()) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const targetPath = await save({
      defaultPath: filename,
      filters: [
        {
          name: params.format.toUpperCase(),
          extensions: [params.format],
        },
      ],
    });

    if (targetPath == null || Array.isArray(targetPath)) {
      return { status: "cancelled", count: records.length };
    }

    await writeTextFile(targetPath, content);
    return {
      status: "saved",
      count: records.length,
      path: targetPath,
    };
  }

  downloadWithBlob(content, filename, mimeType);
  return { status: "downloaded", count: records.length };
}
