"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCard = EventCard;
var format_date_1 = require("@/lib/format-date");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var react_native_1 = require("react-native");
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
    return (<react_native_1.Pressable testID={"event-card-".concat(event.eventId)} onPress={function () { return onPress(event.eventId); }} style={function (_a) {
        var pressed = _a.pressed;
        return ({ opacity: pressed ? 0.8 : 1 });
    }}>
      <ui_tamagui_1.Card style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
        <react_native_1.View style={{
            height: 6,
            width: "100%",
            backgroundColor: "#6366f1",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
        }}/>
        <react_native_1.View style={{ padding: 16 }}>
          <react_native_1.View style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
        }}>
            <react_native_1.View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
              <react_native_1.Text style={{ color: "#111827", fontWeight: "600", fontSize: 16 }} numberOfLines={2}>
                {(_b = event.name) !== null && _b !== void 0 ? _b : event.eventId}
              </react_native_1.Text>
              {formattedDate ? (<react_native_1.Text style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
                  {formattedDate}
                </react_native_1.Text>) : null}
            </react_native_1.View>
            <ui_tamagui_1.Badge variant={isLive ? "success" : "default"}>
              {isLive ? "LIVE" : "OFFLINE"}
            </ui_tamagui_1.Badge>
          </react_native_1.View>

          {hasStats ? (<>
              <react_native_1.View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                <react_native_1.Text style={{ color: "#6b7280", fontSize: 14 }}>
                  {totalParticipants} participantes
                </react_native_1.Text>
                <react_native_1.Text style={{ color: "#6b7280", fontSize: 14 }}>
                  {confirmed} confirmados
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={{ marginTop: 8 }}>
                <react_native_1.View style={{
                height: 8,
                borderRadius: 9999,
                backgroundColor: "rgba(156,163,175,0.3)",
                overflow: "hidden",
                width: "100%",
            }}>
                  <react_native_1.View style={{
                height: "100%",
                borderRadius: 9999,
                backgroundColor: "#6366f1",
                width: "".concat(Math.min(100, pct), "%"),
            }}/>
                </react_native_1.View>
                <react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                  Progresso {pct}%
                </react_native_1.Text>
              </react_native_1.View>
            </>) : null}

          <react_native_1.View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
            paddingTop: 12,
            borderTopWidth: 1,
            borderColor: "#e5e7eb",
        }}>
            <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, fontWeight: "500" }}>
              Ver participantes
            </react_native_1.Text>
            <react_native_1.Text style={{ color: "#6b7280", fontSize: 18 }}>›</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>
      </ui_tamagui_1.Card>
    </react_native_1.Pressable>);
}
