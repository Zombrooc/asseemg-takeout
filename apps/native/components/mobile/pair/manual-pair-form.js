"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualPairForm = ManualPairForm;
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function ManualPairForm(_a) {
    var baseUrl = _a.baseUrl, pairingToken = _a.pairingToken, onChangeBaseUrl = _a.onChangeBaseUrl, onChangeToken = _a.onChangeToken, onSubmit = _a.onSubmit, loading = _a.loading, error = _a.error;
    return (<>
      <primitives_1.Text className="text-foreground font-medium text-sm mb-1.5 leading-snug">
        URL do servidor
      </primitives_1.Text>
      <ui_1.Input placeholder="http://192.168.0.5:5555" value={baseUrl} onChangeText={onChangeBaseUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" className="mb-4 rounded-xl min-h-[48px] border border-border bg-card w-full text-base"/>
      <primitives_1.Text className="text-foreground font-medium text-sm mb-1.5 leading-snug">
        Token de acesso
      </primitives_1.Text>
      <ui_1.Input placeholder="cole o token aqui..." value={pairingToken} onChangeText={onChangeToken} autoCapitalize="characters" autoCorrect={false} className="mb-6 rounded-xl min-h-[48px] border border-border bg-card w-full text-base"/>
      {error ? (<primitives_1.Text className="text-danger text-sm mb-4 leading-snug">{error}</primitives_1.Text>) : null}
      <ui_1.Button testID="pair-submit-button" className="px-4 py-3 rounded-xl min-h-[48px]" onPress={onSubmit} isLoading={loading} isDisabled={loading}>
        Conectar
      </ui_1.Button>
    </>);
}
