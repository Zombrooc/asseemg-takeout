"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStatusCard = ConnectionStatusCard;
var expo_router_1 = require("expo-router");
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function ConnectionStatusCard(_a) {
    var isReachable = _a.isReachable, _b = _a.isConnecting, isConnecting = _b === void 0 ? false : _b, baseUrl = _a.baseUrl, onRetry = _a.onRetry, onDisconnect = _a.onDisconnect;
    var router = (0, expo_router_1.useRouter)();
    if (isConnecting) {
        return (<ui_tamagui_1.Card style={{ marginBottom: 16, backgroundColor: "rgba(245,158,11,0.1)", borderColor: "#f59e0b" }}>
        <react_native_1.View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <react_native_1.View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: "#f59e0b", flexShrink: 0 }}/>
          <react_native_1.Text style={{ color: "#f59e0b", fontWeight: "500", fontSize: 14 }}>Conectando...</react_native_1.Text>
        </react_native_1.View>
        {baseUrl ? (<react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }} numberOfLines={1} ellipsizeMode="middle">
            {baseUrl}
          </react_native_1.Text>) : null}
      </ui_tamagui_1.Card>);
    }
    if (isReachable) {
        return (<ui_tamagui_1.Card style={{ marginBottom: 16 }}>
        <react_native_1.View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <react_native_1.View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: "#10b981", flexShrink: 0 }}/>
          <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 14 }}>Conectado ao desktop</react_native_1.Text>
        </react_native_1.View>
        {baseUrl ? (<react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }} numberOfLines={1} ellipsizeMode="middle">
            {baseUrl}
          </react_native_1.Text>) : null}
        {onDisconnect ? (<react_native_1.View style={{ marginTop: 12 }}>
            <ui_tamagui_1.Button testID="home-unpair" variant="bordered" onPress={onDisconnect}>
              Desparear
            </ui_tamagui_1.Button>
          </react_native_1.View>) : null}
      </ui_tamagui_1.Card>);
    }
    return (<ui_tamagui_1.Card style={{ marginBottom: 16 }}>
      <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 4 }}>
        Sem conexão com o desktop
      </react_native_1.Text>
      <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
        Conecte ao app Takeout Desktop na mesma rede local para iniciar.
      </react_native_1.Text>
      <react_native_1.View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <ui_tamagui_1.Button testID="connection-status-retry" onPress={onRetry}>
          Tentar novamente
        </ui_tamagui_1.Button>
        <ui_tamagui_1.Button testID="connection-status-reconnect" variant="bordered" onPress={function () { return router.push("/pair"); }}>
          Reconectar
        </ui_tamagui_1.Button>
      </react_native_1.View>
    </ui_tamagui_1.Card>);
}
