"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditItemTitle = getAuditItemTitle;
function getAuditItemTitle(item) {
    var _a;
    return ((_a = item.participant_name) === null || _a === void 0 ? void 0 : _a.trim()) || item.ticket_id;
}
