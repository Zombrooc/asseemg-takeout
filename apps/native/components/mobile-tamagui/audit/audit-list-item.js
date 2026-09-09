"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditListItem = AuditListItem;
var format_date_1 = require("@/lib/format-date");
var audit_item_title_1 = require("@/lib/audit-item-title");
var takeout_retirante_payload_1 = require("@/lib/takeout-retirante-payload");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var react_native_1 = require("react-native");
function statusLabel(status) {
    switch (status) {
        case "CONFIRMED":
            return "Confirmado";
        case "DUPLICATE":
            return "Duplicado";
        case "FAILED":
            return "Falho";
        case "REVERSED":
            return "Desfeito";
    }
}
function AuditListItem(_a) {
    var _b;
    var item = _a.item;
    var retirante = (0, takeout_retirante_payload_1.parseTakeoutRetirantePayload)(item.payload_json);
    var title = (0, audit_item_title_1.getAuditItemTitle)(item);
    return (<ui_tamagui_1.Card>
      <react_native_1.View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <react_native_1.Text style={{ color: "#111827", fontWeight: "500", flex: 1, minWidth: 0 }} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </react_native_1.Text>
        <react_native_1.Text style={{ color: "#6b7280", fontSize: 12 }}>{statusLabel(item.status)}</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
        {item.created_at ? (0, format_date_1.formatDateBR)(item.created_at) : "-"}
      </react_native_1.Text>
      {retirante ? (<react_native_1.View style={{ marginTop: 6, gap: 2 }}>
          <react_native_1.Text style={{ color: "#111827", fontSize: 12 }}>Retirante: {retirante.retirante_nome}</react_native_1.Text>
          <react_native_1.Text style={{ color: "#6b7280", fontSize: 12 }}>CPF: {(_b = retirante.retirante_cpf) !== null && _b !== void 0 ? _b : "-"}</react_native_1.Text>
        </react_native_1.View>) : null}
    </ui_tamagui_1.Card>);
}
