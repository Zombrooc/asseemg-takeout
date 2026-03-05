import type { AuditEvent } from "@/lib/takeout-api";

export type AuditRetirantePayload = {
  retiradaPorTerceiro: boolean;
  retiranteNome: string | null;
  retiranteCpf: string | null;
};

export function parseAuditRetirantePayload(payloadJson: string | null): AuditRetirantePayload {
  if (!payloadJson) {
    return {
      retiradaPorTerceiro: false,
      retiranteNome: null,
      retiranteCpf: null,
    };
  }

  try {
    const parsed = JSON.parse(payloadJson) as {
      retirada_por_terceiro?: unknown;
      retirante_nome?: unknown;
      retirante_cpf?: unknown;
    };
    if (parsed.retirada_por_terceiro !== true) {
      return {
        retiradaPorTerceiro: false,
        retiranteNome: null,
        retiranteCpf: null,
      };
    }

    const nome =
      typeof parsed.retirante_nome === "string" && parsed.retirante_nome.trim()
        ? parsed.retirante_nome.trim()
        : null;
    const cpf =
      typeof parsed.retirante_cpf === "string" && parsed.retirante_cpf.trim()
        ? parsed.retirante_cpf.trim()
        : null;

    return {
      retiradaPorTerceiro: true,
      retiranteNome: nome,
      retiranteCpf: cpf,
    };
  } catch {
    return {
      retiradaPorTerceiro: false,
      retiranteNome: null,
      retiranteCpf: null,
    };
  }
}

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildAuditCsv(logs: AuditEvent[]): string {
  const header = [
    "checked_in_at",
    "created_at",
    "source_type",
    "event_id",
    "status",
    "request_id",
    "ticket_id",
    "ticket_source_id",
    "ticket_name",
    "ticket_code",
    "participant_id",
    "participant_name",
    "birth_date",
    "age_at_checkin",
    "operator_alias",
    "operator_device_id",
    "device_id",
    "retirada_por_terceiro",
    "retirante_nome",
    "retirante_cpf",
    "payload_json",
  ]
    .map(csvEscape)
    .join(",");

  const rows = logs.map((log) => {
    const retirante = parseAuditRetirantePayload(log.payload_json);
    return [
      log.checked_in_at,
      log.created_at,
      log.source_type,
      log.event_id ?? "",
      log.status,
      log.request_id,
      log.ticket_id,
      log.ticket_source_id ?? "",
      log.ticket_name ?? "",
      log.ticket_code ?? "",
      log.participant_id ?? "",
      log.participant_name ?? "",
      log.birth_date ?? "",
      log.age_at_checkin ?? "",
      log.operator_alias ?? "",
      log.operator_device_id,
      log.device_id,
      retirante.retiradaPorTerceiro ? "true" : "false",
      retirante.retiranteNome ?? "",
      retirante.retiranteCpf ?? "",
      log.payload_json ?? "",
    ]
      .map(csvEscape)
      .join(",");
  });

  return [header, ...rows].join("\n");
}
