"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusPill = StatusPill;
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function StatusPill(_a) {
    var isReachable = _a.isReachable;
    return (<primitives_1.View className="shrink-0">
      <ui_1.Chip color={isReachable ? "success" : "danger"} size="sm">
        <ui_1.Chip.Label>{isReachable ? "LIVE" : "OFFLINE"}</ui_1.Chip.Label>
      </ui_1.Chip>
    </primitives_1.View>);
}
