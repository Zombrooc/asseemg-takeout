"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotFoundScreen;
var expo_router_1 = require("expo-router");
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function NotFoundScreen() {
    return (<>
      <expo_router_1.Stack.Screen options={{ title: "Not Found" }}/>
      <ui_tamagui_1.ScreenContainer mode="static">
        <react_native_1.View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <ui_tamagui_1.Card style={{ alignItems: "center", padding: 24, width: "90%", maxWidth: 400, alignSelf: "center" }}>
            <react_native_1.Text style={{ fontSize: 36, marginBottom: 12 }}>🤔</react_native_1.Text>
            <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 18, marginBottom: 4 }}>
              Page Not Found
            </react_native_1.Text>
            <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              The page you're looking for doesn't exist.
            </react_native_1.Text>
            <expo_router_1.Link href="/" asChild>
              <ui_tamagui_1.Button>Go Home</ui_tamagui_1.Button>
            </expo_router_1.Link>
          </ui_tamagui_1.Card>
        </react_native_1.View>
      </ui_tamagui_1.ScreenContainer>
    </>);
}
