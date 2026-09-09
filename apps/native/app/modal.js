"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Modal;
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var expo_router_1 = require("expo-router");
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function Modal() {
    function handleClose() {
        expo_router_1.router.back();
    }
    return (<ui_tamagui_1.ScreenContainer mode="static">
      <react_native_1.View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <ui_tamagui_1.Card style={{ padding: 20, width: "100%", maxWidth: "90%", alignSelf: "center" }}>
          <react_native_1.View style={{ alignItems: "center" }}>
            <react_native_1.View style={{
            width: 48,
            height: 48,
            backgroundColor: "#2563eb",
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
        }}>
              <Ionicons_1.default name="checkmark" size={24} color="white"/>
            </react_native_1.View>
            <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 18, marginBottom: 4 }}>
              Modal Screen
            </react_native_1.Text>
            <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              This is an example modal screen for dialogs and confirmations.
            </react_native_1.Text>
          </react_native_1.View>
          <ui_tamagui_1.Button onPress={handleClose} width="100%">
            Close
          </ui_tamagui_1.Button>
        </ui_tamagui_1.Card>
      </react_native_1.View>
    </ui_tamagui_1.ScreenContainer>);
}
