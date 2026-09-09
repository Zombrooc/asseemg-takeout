"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineQueueNotice = OfflineQueueNotice;
var ui_tamagui_1 = require("@/components/ui-tamagui");
var react_native_1 = require("react-native");
function OfflineQueueNotice(_a) {
    var visible = _a.visible;
    if (!visible)
        return null;
    return (<ui_tamagui_1.Banner variant="warn" style={{ marginHorizontal: 16, marginTop: 8 }}>
      <react_native_1.Text style={{ color: "#6b7280", fontSize: 12 }}>
        Sem conexão. Check-in será sincronizado quando houver rede.
      </react_native_1.Text>
    </ui_tamagui_1.Banner>);
}
