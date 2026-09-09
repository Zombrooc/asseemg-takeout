"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualPairForm = ManualPairForm;
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function ManualPairForm(_a) {
    var baseUrl = _a.baseUrl, pairingToken = _a.pairingToken, operatorAlias = _a.operatorAlias, onChangeBaseUrl = _a.onChangeBaseUrl, onChangeToken = _a.onChangeToken, onChangeOperatorAlias = _a.onChangeOperatorAlias, onSubmit = _a.onSubmit, loading = _a.loading, error = _a.error;
    return (<react_native_1.View>
      <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 6 }}>
        URL do servidor
      </react_native_1.Text>
      <ui_tamagui_1.Input placeholder="http://192.168.0.5:5555" value={baseUrl} onChangeText={onChangeBaseUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={{ marginBottom: 16, minHeight: 48 }}/>
      <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 6 }}>
        Token de acesso
      </react_native_1.Text>
      <ui_tamagui_1.Input placeholder="cole o token aqui..." value={pairingToken} onChangeText={onChangeToken} autoCapitalize="characters" autoCorrect={false} style={{ marginBottom: 24, minHeight: 48 }}/>
      <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 6 }}>
        Nome do operador
      </react_native_1.Text>
      <ui_tamagui_1.Input placeholder="Ex: Posto 1 - Ana" value={operatorAlias} onChangeText={onChangeOperatorAlias} autoCorrect={false} style={{ marginBottom: 24, minHeight: 48 }}/>
      {error ? (<react_native_1.Text style={{ color: "#dc2626", fontSize: 14, marginBottom: 16 }}>
          {error}
        </react_native_1.Text>) : null}
      <ui_tamagui_1.Button testID="pair-submit-button" onPress={onSubmit} loading={loading} isDisabled={loading}>
        Conectar
      </ui_tamagui_1.Button>
    </react_native_1.View>);
}
