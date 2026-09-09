"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickActionsRow = QuickActionsRow;
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function QuickActionsRow(_a) {
    var onScan = _a.onScan, onReset = _a.onReset, onCreateReservation = _a.onCreateReservation, _b = _a.createDisabled, createDisabled = _b === void 0 ? false : _b, resetLoading = _a.resetLoading, _c = _a.undoCount, undoCount = _c === void 0 ? 0 : _c;
    return (<react_native_1.View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
      <ui_tamagui_1.Button testID="events-scan-ticket" variant="bordered" onPress={onScan}>
        Escanear ingresso
      </ui_tamagui_1.Button>
      {onCreateReservation ? (<ui_tamagui_1.Button variant="bordered" onPress={onCreateReservation} isDisabled={createDisabled}>
          Cadastrar reserva
        </ui_tamagui_1.Button>) : null}
      <ui_tamagui_1.Button testID="events-reset-checkins" variant="bordered" onPress={onReset} loading={resetLoading} isDisabled={resetLoading}>
        {undoCount > 0 ? "Desfazer (".concat(undoCount, ")") : "Desfazer"}
      </ui_tamagui_1.Button>
    </react_native_1.View>);
}
