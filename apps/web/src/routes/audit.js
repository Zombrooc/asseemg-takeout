"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
var react_router_1 = require("@tanstack/react-router");
var audit_page_1 = require("@/components/takeout/audit-page");
exports.Route = (0, react_router_1.createFileRoute)("/audit")({
    component: audit_page_1.AuditPage,
});
