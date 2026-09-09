"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryStats = SummaryStats;
var primitives_1 = require("@/lib/primitives");
function SummaryStats(_a) {
    var total = _a.total, confirmed = _a.confirmed, pending = _a.pending, _b = _a.pendingSync, pendingSync = _b === void 0 ? 0 : _b;
    return (<primitives_1.View className="px-4 py-3 flex-row gap-3 border-b border-border flex-wrap bg-background">
      <primitives_1.View className="rounded-xl p-3 flex-1 min-w-[80px] bg-muted/10 border border-border/50 overflow-hidden">
        <primitives_1.Text className="text-xl font-bold text-foreground leading-tight">
          {total}
        </primitives_1.Text>
        <primitives_1.Text className="text-muted-foreground text-xs mt-0.5 leading-snug">
          Total
        </primitives_1.Text>
      </primitives_1.View>
      <primitives_1.View className="rounded-xl p-3 flex-1 min-w-[80px] bg-success/10 border border-success/20 overflow-hidden">
        <primitives_1.Text className="text-xl font-bold text-success leading-tight">
          {confirmed}
        </primitives_1.Text>
        <primitives_1.Text className="text-muted-foreground text-xs mt-0.5 leading-snug">
          Confirmados
        </primitives_1.Text>
      </primitives_1.View>
      <primitives_1.View className="rounded-xl p-3 flex-1 min-w-[80px] bg-warning/10 border border-warning/20 overflow-hidden">
        <primitives_1.Text className="text-xl font-bold text-warning leading-tight">
          {pending}
        </primitives_1.Text>
        <primitives_1.Text className="text-muted-foreground text-xs mt-0.5 leading-snug">
          Aguardando
        </primitives_1.Text>
      </primitives_1.View>
      {pendingSync > 0 ? (<primitives_1.View className="rounded-xl p-3 bg-muted/20 border border-border/50 self-center overflow-hidden">
          <primitives_1.Text className="text-sm font-semibold text-foreground leading-tight">
            {pendingSync}
          </primitives_1.Text>
          <primitives_1.Text className="text-muted-foreground text-xs mt-0.5 leading-snug">
            Sync
          </primitives_1.Text>
        </primitives_1.View>) : null}
    </primitives_1.View>);
}
