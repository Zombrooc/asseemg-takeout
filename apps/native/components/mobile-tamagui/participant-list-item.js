"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipantListItem = void 0;
var react_1 = require("react");
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var participant_list_state_1 = require("@/lib/participant-list-state");
var statusColorMap = {
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#dc2626",
};
function ParticipantListItemComponent(_a) {
    var id = _a.id, ticketId = _a.ticketId, name = _a.name, ticketLabel = _a.ticketLabel, isConfirmed = _a.isConfirmed, isPendingSync = _a.isPendingSync, isConflict = _a.isConflict, lockedByOther = _a.lockedByOther, _b = _a.alerts, alerts = _b === void 0 ? [] : _b, onPrimaryAction = _a.onPrimaryAction, onDismissConflict = _a.onDismissConflict;
    var state = (0, participant_list_state_1.getParticipantListState)({
        isConfirmed: isConfirmed,
        lockedByOther: lockedByOther,
        isConflict: isConflict,
        isPendingSync: isPendingSync,
    });
    var statusColor = state.statusTone === "success"
        ? statusColorMap.success
        : state.statusTone === "warning"
            ? statusColorMap.warning
            : state.statusTone === "danger"
                ? statusColorMap.danger
                : "#111827";
    var initials = name != null && name.trim()
        ? name
            .split(" ")
            .slice(0, 2)
            .map(function (n) { return n[0]; })
            .join("")
            .toUpperCase()
        : "—";
    var showInitials = !state.showDismissConflict &&
        state.primaryActionLabel === "Fazer check-in" &&
        !state.primaryActionDisabled;
    var hasAlerts = alerts.length > 0;
    return (<ui_tamagui_1.Card style={{ marginBottom: 8, marginHorizontal: 16, overflow: "hidden" }}>
      <react_native_1.View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        {hasAlerts ? (<react_native_1.View testID={"participant-alert-icon-".concat(id)} style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                backgroundColor: "rgba(220,38,38,0.12)",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}>
            <Ionicons_1.default name="alert-circle" size={20} color="#dc2626"/>
          </react_native_1.View>) : showInitials ? (<react_native_1.View style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                backgroundColor: "rgba(156,163,175,0.2)",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}>
            <react_native_1.Text style={{ color: "#111827", fontWeight: "600", fontSize: 14 }}>{initials}</react_native_1.Text>
          </react_native_1.View>) : null}
        <react_native_1.View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
          <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 16 }} numberOfLines={1} ellipsizeMode="tail">
            {name !== null && name !== void 0 ? name : "—"}
          </react_native_1.Text>
          <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, marginTop: 2 }} numberOfLines={1} ellipsizeMode="tail">
            {ticketLabel}
          </react_native_1.Text>
          {state.statusLabel ? (<react_native_1.Text style={{ color: statusColor, fontSize: 12, marginTop: 4 }}>{state.statusLabel}</react_native_1.Text>) : null}
          {alerts.map(function (alert) { return (<react_native_1.Text key={"".concat(id, "-").concat(alert.code, "-").concat(alert.message)} style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
              {alert.message}
            </react_native_1.Text>); })}
        </react_native_1.View>
        {state.showDismissConflict ? (<ui_tamagui_1.Button testID={"participant-dismiss-".concat(ticketId)} variant="outline" onPress={function () { return onDismissConflict(ticketId); }} style={{ flexShrink: 0 }}>
            Dispensar
          </ui_tamagui_1.Button>) : (<ui_tamagui_1.Button testID={"participant-confirm-".concat(id)} onPress={function () { return onPrimaryAction(id); }} isDisabled={state.primaryActionDisabled} style={{ flexShrink: 0 }}>
            {state.primaryActionLabel}
          </ui_tamagui_1.Button>)}
      </react_native_1.View>
    </ui_tamagui_1.Card>);
}
exports.ParticipantListItem = (0, react_1.memo)(ParticipantListItemComponent);
