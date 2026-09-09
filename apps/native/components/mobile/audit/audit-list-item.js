"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditListItem = AuditListItem;
var format_date_1 = require("@/lib/format-date");
var audit_item_title_1 = require("@/lib/audit-item-title");
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
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
    var item = _a.item;
    var title = (0, audit_item_title_1.getAuditItemTitle)(item);
    return (<ui_1.Card>
      <primitives_1.View className="flex-row items-center justify-between gap-2">
        <primitives_1.Text className="text-foreground font-medium flex-1 min-w-0" numberOfLines={1} ellipsizeMode="tail">{title}</primitives_1.Text>
        <primitives_1.Text className="text-muted-foreground text-xs">{statusLabel(item.status)}</primitives_1.Text>
      </primitives_1.View>
      <primitives_1.Text className="text-muted-foreground text-xs mt-1">
        {item.created_at ? (0, format_date_1.formatDateBR)(item.created_at) : "—"}
      </primitives_1.Text>
    </ui_1.Card>);
}
