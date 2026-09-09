"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditFilters = AuditFilters;
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
/** Alinhado a GET /audit (status: CONFIRMED | DUPLICATE | FAILED | REVERSED) */
var OPTIONS = ["ALL", "CONFIRMED", "DUPLICATE", "FAILED", "REVERSED"];
var STATUS_LABEL = {
    ALL: "Todos",
    CONFIRMED: "Confirmado",
    DUPLICATE: "Duplicado",
    FAILED: "Falho",
    REVERSED: "Desfeito",
};
function AuditFilters(_a) {
    var value = _a.value, onChange = _a.onChange;
    return (<primitives_1.View className="flex-row flex-wrap gap-2">
      {OPTIONS.map(function (option) { return (<ui_1.Chip key={option} testID={"audit-filters-".concat(option.toLowerCase())} color={value === option ? "primary" : "secondary"} onPress={function () { return onChange(option); }}>
          <ui_1.Chip.Label>{STATUS_LABEL[option]}</ui_1.Chip.Label>
        </ui_1.Chip>); })}
    </primitives_1.View>);
}
