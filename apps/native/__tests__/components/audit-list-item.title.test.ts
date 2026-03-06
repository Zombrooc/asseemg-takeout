import type { AuditEvent } from "@/lib/takeout-api-types";
import { getAuditItemTitle } from "@/lib/audit-item-title";

function baseAudit(overrides: Partial<AuditEvent>): AuditEvent {
  return {
    request_id: "req-1",
    ticket_id: "ticket-123",
    device_id: "dev-1",
    status: "CONFIRMED",
    payload_json: null,
    created_at: "2026-03-01T10:00:00Z",
    source_type: "json_sync",
    event_id: "ev-1",
    participant_id: "p-1",
    participant_name: null,
    birth_date: null,
    age_at_checkin: null,
    ticket_source_id: null,
    ticket_name: null,
    ticket_code: null,
    operator_alias: null,
    operator_device_id: "dev-1",
    checked_in_at: "2026-03-01T10:00:00Z",
    ...overrides,
  };
}

describe("audit list item title", () => {
  it("uses participant_name when present", () => {
    const item = baseAudit({ participant_name: "Joao da Silva" });
    expect(getAuditItemTitle(item)).toBe("Joao da Silva");
  });

  it("falls back to ticket_id when participant_name is missing", () => {
    const item = baseAudit({ participant_name: null });
    expect(getAuditItemTitle(item)).toBe("ticket-123");
  });

  it("falls back to ticket_id when participant_name is blank", () => {
    const item = baseAudit({ participant_name: "   " });
    expect(getAuditItemTitle(item)).toBe("ticket-123");
  });
});
