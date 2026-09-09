"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairingTipsCard = PairingTipsCard;
var react_1 = require("react");
var react_native_1 = require("react-native");
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var TIPS = [
    "Abra o app Takeout Desktop no computador",
    "Aguarde o servidor iniciar (indicador verde na tela inicial)",
    "O QR Code e URL ficam visíveis na seção de pareamento",
    "O token é renovado a cada sessão por segurança",
    "Dispositivo e desktop devem estar na mesma rede Wi-Fi",
];
function PairingTipsCard() {
    var _a = (0, react_1.useState)(false), expanded = _a[0], setExpanded = _a[1];
    return (<react_native_1.Pressable onPress={function () { return setExpanded(!expanded); }} style={function (_a) {
        var pressed = _a.pressed;
        return ({ opacity: pressed ? 0.9 : 1 });
    }}>
      <ui_tamagui_1.Card style={{ marginBottom: 16, padding: 0, overflow: "hidden", minHeight: 48 }}>
        <react_native_1.View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, flex: 1 }}>
            Como encontrar o QR Code
          </react_native_1.Text>
          <Ionicons_1.default name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b"/>
        </react_native_1.View>
        {expanded ? (<react_native_1.View style={{
                paddingHorizontal: 16,
                paddingBottom: 16,
                paddingTop: 0,
                borderTopWidth: 1,
                borderColor: "#e5e7eb",
            }}>
            {TIPS.map(function (tip, i) { return (<react_native_1.View key={i} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, fontWeight: "500", width: 20, flexShrink: 0 }}>
                  {i + 1}.
                </react_native_1.Text>
                <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, flex: 1 }}>{tip}</react_native_1.Text>
              </react_native_1.View>); })}
          </react_native_1.View>) : null}
      </ui_tamagui_1.Card>
    </react_native_1.Pressable>);
}
