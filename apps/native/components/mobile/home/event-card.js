"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCard = EventCard;
var format_date_1 = require("@/lib/format-date");
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function EventCard(_a) {
    var _b;
    var event = _a.event, onPress = _a.onPress, _c = _a.isLive, isLive = _c === void 0 ? true : _c, totalParticipants = _a.totalParticipants, confirmed = _a.confirmed;
    var formattedDate = event.startDate ? (0, format_date_1.formatDateBR)(event.startDate) : null;
    var hasStats = totalParticipants != null &&
        confirmed != null &&
        totalParticipants >= 0 &&
        confirmed >= 0;
    var pct = hasStats && totalParticipants > 0
        ? Math.round((confirmed / totalParticipants) * 100)
        : 0;
    return (<primitives_1.Pressable testID={"event-card-".concat(event.eventId)} onPress={function () { return onPress(event.eventId); }} className="mb-3 active:opacity-80 rounded-2xl">
      <ui_1.Card className="overflow-hidden p-0 border border-border rounded-2xl bg-card">
        <primitives_1.View className="h-1.5 w-full bg-accent rounded-t-2xl"/>
        <primitives_1.View className="p-4">
          <primitives_1.View className="flex-row items-start justify-between gap-3">
            <primitives_1.View className="flex-1 min-w-0 shrink">
              <primitives_1.Text className="text-foreground font-semibold text-base leading-tight" numberOfLines={2}>
                {(_b = event.name) !== null && _b !== void 0 ? _b : event.eventId}
              </primitives_1.Text>
              {formattedDate ? (<primitives_1.Text className="text-muted-foreground text-sm mt-1 leading-snug">
                  {formattedDate}
                </primitives_1.Text>) : null}
            </primitives_1.View>
            <primitives_1.View className="shrink-0">
              <ui_1.Chip color={isLive ? "success" : "default"} size="sm">
                <ui_1.Chip.Label>{isLive ? "LIVE" : "OFFLINE"}</ui_1.Chip.Label>
              </ui_1.Chip>
            </primitives_1.View>
          </primitives_1.View>

          {hasStats ? (<>
              <primitives_1.View className="flex-row gap-4 mt-3">
                <primitives_1.Text className="text-muted-foreground text-sm leading-snug">
                  {totalParticipants} participantes
                </primitives_1.Text>
                <primitives_1.Text className="text-muted-foreground text-sm leading-snug">
                  {confirmed} confirmados
                </primitives_1.Text>
              </primitives_1.View>
              <primitives_1.View className="mt-2">
                <primitives_1.View className="h-2 rounded-full bg-muted/30 overflow-hidden w-full">
                  <primitives_1.View className="h-full rounded-full bg-accent" style={{ width: "".concat(Math.min(100, pct), "%") }}/>
                </primitives_1.View>
                <primitives_1.Text className="text-muted-foreground text-xs mt-1 leading-tight">
                  Progresso {pct}%
                </primitives_1.Text>
              </primitives_1.View>
            </>) : null}

          <primitives_1.View className="flex-row items-center justify-between mt-4 pt-3 border-t border-border">
            <primitives_1.Text className="text-muted-foreground text-sm font-medium">
              Ver participantes
            </primitives_1.Text>
            <primitives_1.Text className="text-muted-foreground text-lg leading-none">
              ›
            </primitives_1.Text>
          </primitives_1.View>
        </primitives_1.View>
      </ui_1.Card>
    </primitives_1.Pressable>);
}
