"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionPrompt = PermissionPrompt;
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function PermissionPrompt(_a) {
    var title = _a.title, description = _a.description, onConfirm = _a.onConfirm, onBack = _a.onBack;
    return (<react_native_1.View>
      <react_native_1.Text style={{ color: "#111827", fontWeight: "500", marginBottom: 8 }}>{title}</react_native_1.Text>
      <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>{description}</react_native_1.Text>
      <ui_tamagui_1.Button onPress={onConfirm}>Permitir câmera</ui_tamagui_1.Button>
      <react_native_1.View style={{ marginTop: 12 }}>
        <ui_tamagui_1.Button variant="bordered" onPress={onBack}>
          Voltar
        </ui_tamagui_1.Button>
      </react_native_1.View>
    </react_native_1.View>);
}
