import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuditLogTable } from "@/components/audit-log-table";
import type { AuditEvent } from "@/lib/takeout-api";

describe("AuditLogTable", () => {
  it("renders enriched audit fields", () => {
    const logs: AuditEvent[] = [
      {
        request_id: "req-1",
        ticket_id: "seat-1",
        device_id: "mobile-1",
        status: "CONFIRMED",
        payload_json: null,
        created_at: "2026-03-05T10:00:00Z",
        source_type: "json_sync",
        event_id: "ev-1",
        participant_id: "p-1",
        participant_name: "Maria Silva",
        birth_date: "1990-01-01",
        age_at_checkin: 35,
        ticket_source_id: "orig-1",
        ticket_name: "10K",
        ticket_code: "QR-1",
        operator_alias: "Posto 1 - Ana",
        operator_device_id: "paired-device-1",
        checked_in_at: "2026-03-05T10:00:00Z",
      },
    ];

    render(<AuditLogTable logs={logs} />);

    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("10K")).toBeInTheDocument();
    expect(screen.getByText("orig-1")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(screen.getByText("Posto 1 - Ana")).toBeInTheDocument();
  });
});
