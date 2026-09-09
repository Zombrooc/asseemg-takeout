"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
var react_router_1 = require("@tanstack/react-router");
var import_page_1 = require("@/components/takeout/import-page");
exports.Route = (0, react_router_1.createFileRoute)("/import")({
    component: import_page_1.ImportPage,
});
