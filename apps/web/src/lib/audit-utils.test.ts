import { describe, expect, it } from "vitest";
import { buildAuditCsv, parseAuditRetirantePayload } from "@/lib/audit-utils";
import type { AuditEvent } from "@/lib/takeout-api";

describe("audit-utils", () => {
  it("parseAuditRetirantePayload extracts third-party data", () => {
    const parsed = parseAuditRetirantePayload(
      '{"retirada_por_terceiro":true,"retirante_nome":"Maria","retirante_cpf":"12345678900"}'
    );
    expect(parsed).toEqual({
      retiradaPorTerceiro: true,
      retiranteNome: "Maria",
      retiranteCpf: "12345678900",
    });
  });

  it("parseAuditRetirantePayload returns safe defaults for invalid json", () => {
    const parsed = parseAuditRetirantePayload("{invalid");
    expect(parsed).toEqual({
      retiradaPorTerceiro: false,
      retiranteNome: null,
      retiranteCpf: null,
    });
  });

  it("buildAuditCsv exports analytic columns and escapes values", () => {
    const logs: AuditEvent[] = [
      {
        request_id: 'req-"1"',
        ticket_id: "T1",
        device_id: "mobile-01",
        status: "CONFIRMED",
        source_type: "json_sync",
        event_id: "ev-1",
        participant_id: "p1",
        participant_name: "Ana",
        birth_date: "1990-01-01",
        age_at_checkin: 35,
        ticket_source_id: "src-1",
        ticket_name: "5K",
        ticket_code: "QR-1",
        operator_alias: "Operadora A",
        operator_device_id: "mobile-01",
        checked_in_at: "2026-03-04T12:00:00Z",
        payload_json:
          '{"retirada_por_terceiro":true,"retirante_nome":"Ana, Paula","retirante_cpf":"123"}',
        created_at: "2026-03-04T12:00:00Z",
      },
    ];
    const csv = buildAuditCsv(logs);
    expect(csv).toContain('"retirada_por_terceiro"');
    expect(csv).toContain('"retirante_nome"');
    expect(csv).toContain('"retirante_cpf"');
    expect(csv).toContain('"true","Ana, Paula","123"');
    expect(csv).toContain('"req-""1"""');
  });
});
