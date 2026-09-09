"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("@testing-library/react");
var vitest_1 = require("vitest");
var audit_log_table_1 = require("@/components/audit-log-table");
(0, vitest_1.describe)("AuditLogTable", function () {
    (0, vitest_1.it)("renders enriched audit fields", function () {
        var logs = [
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
        (0, react_1.render)(<audit_log_table_1.AuditLogTable logs={logs}/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Maria Silva")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText("10K")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText("orig-1")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText("35")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText("Posto 1 - Ana")).toBeInTheDocument();
    });
});
