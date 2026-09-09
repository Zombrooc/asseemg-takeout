"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickActionsRow = QuickActionsRow;
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function QuickActionsRow(_a) {
    var onScan = _a.onScan, onReset = _a.onReset, resetLoading = _a.resetLoading, _b = _a.undoCount, undoCount = _b === void 0 ? 0 : _b;
    return (<primitives_1.View className="flex-row gap-2 flex-wrap items-center mt-2">
      <ui_1.Button testID="events-scan-ticket" size="sm" variant="bordered" className="px-4 py-2 rounded-xl min-h-[40px] border-border" onPress={onScan}>
        Escanear ingresso
      </ui_1.Button>
      <ui_1.Button testID="events-reset-checkins" size="sm" variant="bordered" className="px-4 py-2 rounded-xl min-h-[40px] border-border" onPress={onReset} isLoading={resetLoading} isDisabled={resetLoading}>
        {undoCount > 0 ? "Desfazer (".concat(undoCount, ")") : "Desfazer"}
      </ui_1.Button>
    </primitives_1.View>);
}
