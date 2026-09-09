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
exports.AuditPage = AuditPage;
var react_query_1 = require("@tanstack/react-query");
var react_1 = require("react");
var audit_filters_1 = require("@/components/audit-filters");
var audit_log_table_1 = require("@/components/audit-log-table");
var audit_utils_1 = require("@/lib/audit-utils");
var takeout_api_1 = require("@/lib/takeout-api");
function AuditPage() {
    var _a;
    var _b = (0, react_1.useState)(""), statusFilter = _b[0], setStatusFilter = _b[1];
    var _c = (0, react_1.useState)(""), searchQuery = _c[0], setSearchQuery = _c[1];
    var _d = (0, react_1.useState)(""), selectedEventId = _d[0], setSelectedEventId = _d[1];
    var _e = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "events", "audit-selector"],
        queryFn: function () { return (0, takeout_api_1.getEvents)(true); },
    }).data, events = _e === void 0 ? [] : _e;
    var effectiveEventId = selectedEventId || ((_a = events[0]) === null || _a === void 0 ? void 0 : _a.eventId) || "";
    var _f = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "audit", effectiveEventId, statusFilter],
        queryFn: function () {
            return (0, takeout_api_1.getAudit)(__assign({ eventId: effectiveEventId }, (statusFilter ? { status: statusFilter } : {})));
        },
        enabled: !!effectiveEventId,
    }), _g = _f.data, logs = _g === void 0 ? [] : _g, isLoading = _f.isLoading;
    var filteredLogs = (0, react_1.useMemo)(function () {
        if (!searchQuery.trim())
            return logs;
        var q = searchQuery.trim().toLowerCase();
        return logs.filter(function (log) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            var retirada = (0, audit_utils_1.parseAuditRetirantePayload)(log.payload_json);
            return (log.ticket_id.toLowerCase().includes(q) ||
                log.device_id.toLowerCase().includes(q) ||
                log.request_id.toLowerCase().includes(q) ||
                log.status.toLowerCase().includes(q) ||
                ((_b = (_a = log.participant_name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(q)) !== null && _b !== void 0 ? _b : false) ||
                ((_d = (_c = log.ticket_name) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(q)) !== null && _d !== void 0 ? _d : false) ||
                ((_f = (_e = log.operator_alias) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(q)) !== null && _f !== void 0 ? _f : false) ||
                ((_h = (_g = retirada.retiranteNome) === null || _g === void 0 ? void 0 : _g.toLowerCase().includes(q)) !== null && _h !== void 0 ? _h : false) ||
                ((_k = (_j = retirada.retiranteCpf) === null || _j === void 0 ? void 0 : _j.toLowerCase().includes(q)) !== null && _k !== void 0 ? _k : false));
        });
    }, [logs, searchQuery]);
    var handleClearFilters = function () {
        setStatusFilter("");
        setSearchQuery("");
    };
    var handleExport = function () {
        var blob = new Blob([(0, audit_utils_1.buildAuditCsv)(filteredLogs)], { type: "text/csv;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "audit-".concat(new Date().toISOString().slice(0, 10), ".csv");
        a.click();
        URL.revokeObjectURL(url);
    };
    return (<main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">Auditoria</h1>

      <div className="max-w-md space-y-2">
        <label htmlFor="event-audit-filter" className="text-sm font-medium">
          Evento
        </label>
        <select id="event-audit-filter" aria-label="Selecionar evento da auditoria" value={effectiveEventId} onChange={function (e) { return setSelectedEventId(e.target.value); }} className="h-10 w-full rounded-md border bg-background px-3">
          {events.map(function (event) {
            var _a;
            return (<option key={event.eventId} value={event.eventId}>
              {(_a = event.name) !== null && _a !== void 0 ? _a : event.eventId}
            </option>);
        })}
        </select>
      </div>

      <audit_filters_1.AuditFilters statusFilter={statusFilter !== null && statusFilter !== void 0 ? statusFilter : ""} onStatusChange={function (v) { return setStatusFilter(v || undefined); }} searchQuery={searchQuery} onSearchChange={setSearchQuery} onClear={handleClearFilters}/>

      <audit_log_table_1.AuditLogTable logs={filteredLogs} isLoading={isLoading} onExport={handleExport}/>
    </main>);
}
