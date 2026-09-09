"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuditScreen;
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var audit_1 = require("@/components/mobile-tamagui/audit");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var react_1 = require("react");
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var react_native_2 = require("react-native");
function AuditScreen() {
    var _a, _b, _c;
    var _d = (0, takeout_connection_context_1.useTakeoutConnection)(), api = _d.api, isPaired = _d.isPaired;
    var _e = (0, react_1.useState)("ALL"), statusFilter = _e[0], setStatusFilter = _e[1];
    var eventsQuery = (0, react_query_1.useQuery)({
        queryKey: ["takeout-events-audit-screen"],
        queryFn: function () { return (api ? api.getEvents() : Promise.reject(new Error("No API"))); },
        enabled: !!api && isPaired,
    });
    var effectiveEventId = (_c = (_b = (_a = eventsQuery.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.eventId) !== null && _c !== void 0 ? _c : null;
    var auditQuery = (0, react_query_1.useQuery)({
        queryKey: ["takeout-audit", effectiveEventId, statusFilter],
        queryFn: function () {
            return api && effectiveEventId
                ? api.getAudit(statusFilter === "ALL"
                    ? { eventId: effectiveEventId }
                    : { eventId: effectiveEventId, status: statusFilter })
                : Promise.reject(new Error("No API"));
        },
        enabled: !!api && isPaired && !!effectiveEventId,
    });
    var items = (0, react_1.useMemo)(function () { var _a; return (_a = auditQuery.data) !== null && _a !== void 0 ? _a : []; }, [auditQuery.data]);
    if (!isPaired) {
        return (<ui_tamagui_1.ScreenContainer mode="static">
        <react_native_2.View style={{ padding: 16, paddingTop: 24, flex: 1 }}>
          <react_native_2.Text style={{ fontSize: 24, fontWeight: "600", color: "#111827", marginBottom: 8 }}>
            Auditoria
          </react_native_2.Text>
          <react_native_2.Text style={{ color: "#6b7280", marginBottom: 24 }}>
            Pareie com o desktop para ver o histórico de confirmações.
          </react_native_2.Text>
          <expo_router_1.Link href="/pair" asChild>
            <ui_tamagui_1.Button testID="audit-pair-cta">Parear com o Desktop</ui_tamagui_1.Button>
          </expo_router_1.Link>
        </react_native_2.View>
      </ui_tamagui_1.ScreenContainer>);
    }
    return (<ui_tamagui_1.ScreenContainer mode="static">
      <react_native_2.View style={{ padding: 16, paddingBottom: 16, flex: 1 }}>
        <react_native_2.Text style={{ fontSize: 24, fontWeight: "600", color: "#111827", marginBottom: 16 }}>
          Auditoria
        </react_native_2.Text>
        <react_native_2.View style={{ marginBottom: 16 }}>
          <audit_1.AuditFilters value={statusFilter} onChange={setStatusFilter}/>
        </react_native_2.View>
        {auditQuery.isLoading ? (<react_native_2.Text style={{ color: "#6b7280", paddingVertical: 32 }}>Carregando...</react_native_2.Text>) : !effectiveEventId ? (<react_native_2.Text style={{ color: "#6b7280", paddingVertical: 32 }}>Nenhum evento disponivel.</react_native_2.Text>) : items.length === 0 ? (<react_native_2.Text style={{ color: "#6b7280", paddingVertical: 32 }}>
            Nenhum registro de auditoria.
          </react_native_2.Text>) : (<react_native_1.FlatList data={items} keyExtractor={function (item) { return item.request_id; }} renderItem={function (_a) {
            var item = _a.item;
            return <audit_1.AuditListItem item={item}/>;
        }} contentContainerStyle={{ paddingBottom: 24 }} removeClippedSubviews/>)}
      </react_native_2.View>
    </ui_tamagui_1.ScreenContainer>);
}
