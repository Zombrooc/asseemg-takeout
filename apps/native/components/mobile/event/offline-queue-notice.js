"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineQueueNotice = OfflineQueueNotice;
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function OfflineQueueNotice(_a) {
    var visible = _a.visible;
    if (!visible)
        return null;
    return (<ui_1.Banner className="mx-4 mt-2 px-3 py-2 rounded-xl border border-warning/30 bg-warning/10">
      <primitives_1.Text className="text-muted-foreground text-xs leading-relaxed">
        Sem conexão. Check-in será sincronizado quando houver rede.
      </primitives_1.Text>
    </ui_1.Banner>);
}
