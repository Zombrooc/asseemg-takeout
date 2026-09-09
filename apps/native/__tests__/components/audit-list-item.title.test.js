"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var audit_item_title_1 = require("@/lib/audit-item-title");
function baseAudit(overrides) {
    return __assign({ request_id: "req-1", ticket_id: "ticket-123", device_id: "dev-1", status: "CONFIRMED", payload_json: null, created_at: "2026-03-01T10:00:00Z", source_type: "json_sync", event_id: "ev-1", participant_id: "p-1", participant_name: null, birth_date: null, age_at_checkin: null, ticket_source_id: null, ticket_name: null, ticket_code: null, operator_alias: null, operator_device_id: "dev-1", checked_in_at: "2026-03-01T10:00:00Z" }, overrides);
}
describe("audit list item title", function () {
    it("uses participant_name when present", function () {
        var item = baseAudit({ participant_name: "Joao da Silva" });
        expect((0, audit_item_title_1.getAuditItemTitle)(item)).toBe("Joao da Silva");
    });
    it("falls back to ticket_id when participant_name is missing", function () {
        var item = baseAudit({ participant_name: null });
        expect((0, audit_item_title_1.getAuditItemTitle)(item)).toBe("ticket-123");
    });
    it("falls back to ticket_id when participant_name is blank", function () {
        var item = baseAudit({ participant_name: "   " });
        expect((0, audit_item_title_1.getAuditItemTitle)(item)).toBe("ticket-123");
    });
});
