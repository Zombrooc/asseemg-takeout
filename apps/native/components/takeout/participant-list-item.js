"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipantListItem = void 0;
var react_1 = require("react");
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var heroui_native_1 = require("heroui-native");
var participant_list_state_1 = require("@/lib/participant-list-state");
var primitives_1 = require("@/lib/primitives");
var responsive_1 = require("@/utils/responsive");
function ParticipantListItemComponent(_a) {
    var id = _a.id, ticketId = _a.ticketId, name = _a.name, ticketLabel = _a.ticketLabel, isConfirmed = _a.isConfirmed, isPendingSync = _a.isPendingSync, isConflict = _a.isConflict, lockedByOther = _a.lockedByOther, _b = _a.alerts, alerts = _b === void 0 ? [] : _b, onPrimaryAction = _a.onPrimaryAction, onDismissConflict = _a.onDismissConflict;
    var scale = (0, responsive_1.useResponsiveScale)().scale;
    var state = (0, participant_list_state_1.getParticipantListState)({
        isConfirmed: isConfirmed,
        lockedByOther: lockedByOther,
        isConflict: isConflict,
        isPendingSync: isPendingSync,
    });
    var statusClassName = state.statusTone === "success"
        ? "text-success text-xs mt-1"
        : state.statusTone === "warning"
            ? "text-warning text-xs mt-1"
            : state.statusTone === "danger"
                ? "text-danger text-xs mt-1"
                : "";
    var isDefaultState = !state.showDismissConflict &&
        state.primaryActionLabel === "Fazer check-in" &&
        !state.primaryActionDisabled;
    var hasAlerts = alerts.length > 0;
    var initials = name != null && name.trim()
        ? name
            .split(" ")
            .slice(0, 2)
            .map(function (n) { return n[0]; })
            .join("")
            .toUpperCase()
        : "—";
    return (<heroui_native_1.Surface variant="secondary" className="rounded-2xl mb-2 overflow-hidden border border-border" style={{ marginHorizontal: scale(16), padding: scale(16) }}>
      <primitives_1.View className="flex-row justify-between items-center gap-3">
        {hasAlerts ? (<primitives_1.View testID={"participant-alert-icon-".concat(id)} className="w-10 h-10 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: "rgba(220,38,38,0.12)" }}>
            <Ionicons_1.default name="alert-circle" size={20} color="#dc2626"/>
          </primitives_1.View>) : isDefaultState ? (<primitives_1.View className="w-10 h-10 rounded-full bg-muted/20 items-center justify-center shrink-0">
            <primitives_1.Text className="text-foreground font-semibold text-sm leading-none">
              {initials}
            </primitives_1.Text>
          </primitives_1.View>) : null}
        <primitives_1.View className="flex-1 min-w-0 shrink">
          <primitives_1.Text className="text-foreground font-medium text-base leading-snug" numberOfLines={1} ellipsizeMode="tail">
            {name !== null && name !== void 0 ? name : "—"}
          </primitives_1.Text>
          <primitives_1.Text className="text-muted-foreground text-sm mt-0.5 leading-snug" numberOfLines={1} ellipsizeMode="tail">
            {ticketLabel}
          </primitives_1.Text>
          {state.statusLabel ? (<primitives_1.Text className={statusClassName}>{state.statusLabel}</primitives_1.Text>) : null}
          {alerts.map(function (alert) { return (<primitives_1.Text key={"".concat(id, "-").concat(alert.code, "-").concat(alert.message)} className="text-danger text-xs mt-1 leading-snug">
              {alert.message}
            </primitives_1.Text>); })}
        </primitives_1.View>
        {state.showDismissConflict ? (<heroui_native_1.Button testID={"participant-dismiss-".concat(ticketId)} size="sm" variant="outline" className="px-3 py-2 rounded-xl min-h-[36px] border-border shrink-0" onPress={function () { return onDismissConflict(ticketId); }}>
            Dispensar
          </heroui_native_1.Button>) : (<heroui_native_1.Button testID={"participant-confirm-".concat(id)} size="sm" className="px-3 py-2 rounded-xl min-h-[36px] shrink-0" onPress={function () { return onPrimaryAction(id); }} isDisabled={state.primaryActionDisabled}>
            {state.primaryActionLabel}
          </heroui_native_1.Button>)}
      </primitives_1.View>
    </heroui_native_1.Surface>);
}
exports.ParticipantListItem = (0, react_1.memo)(ParticipantListItemComponent);
