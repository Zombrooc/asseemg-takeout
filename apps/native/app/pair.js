"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PairScreen;
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var expo_camera_1 = require("expo-camera");
var expo_constants_1 = require("expo-constants");
var expo_router_1 = require("expo-router");
var react_1 = require("react");
var react_native_1 = require("react-native");
var pair_1 = require("@/components/mobile-tamagui/pair");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function generateDeviceId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function parsePairingUrl(urlString) {
    try {
        var u = new URL(urlString.trim());
        var token = u.searchParams.get("token");
        if (!token)
            return null;
        var baseUrl = "".concat(u.protocol, "//").concat(u.host);
        return { baseUrl: baseUrl, token: token };
    }
    catch (_a) {
        return null;
    }
}
function PairScreen() {
    var _this = this;
    var _a = (0, takeout_connection_context_1.useTakeoutConnection)(), defaultBaseUrl = _a.defaultBaseUrl, setConnection = _a.setConnection;
    var router = (0, expo_router_1.useRouter)();
    var _b = (0, react_1.useState)(defaultBaseUrl), baseUrl = _b[0], setBaseUrl = _b[1];
    var _c = (0, react_1.useState)(""), pairingToken = _c[0], setPairingToken = _c[1];
    var _d = (0, react_1.useState)(""), operatorAlias = _d[0], setOperatorAlias = _d[1];
    var _e = (0, react_1.useState)(false), loading = _e[0], setLoading = _e[1];
    var _f = (0, react_1.useState)(null), error = _f[0], setError = _f[1];
    var _g = (0, react_1.useState)(false), showScanner = _g[0], setShowScanner = _g[1];
    var _h = (0, react_1.useState)("qr"), pairMethod = _h[0], setPairMethod = _h[1];
    var _j = (0, expo_camera_1.useCameraPermissions)(), permission = _j[0], requestPermission = _j[1];
    var pairingInFlightRef = (0, react_1.useRef)(false);
    var doPair = (0, react_1.useCallback)(function (url, token) { return __awaiter(_this, void 0, void 0, function () {
        var base, t, alias, deviceId, res, raw, data, e_1;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (pairingInFlightRef.current)
                        return [2 /*return*/];
                    base = url.trim().replace(/\/$/, "");
                    t = token.trim();
                    alias = operatorAlias.trim();
                    if (!base || !t || !alias) {
                        setError("URL, token e nome do operador sao obrigatorios.");
                        return [2 /*return*/];
                    }
                    deviceId = generateDeviceId();
                    pairingInFlightRef.current = true;
                    setError(null);
                    setLoading(true);
                    console.info("[pair.mobile] start", {
                        platform: react_native_1.Platform.OS,
                        appVersion: (_b = (_a = expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : "unknown",
                        deviceId: deviceId,
                        baseUrl: base,
                    });
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, fetch("".concat(base, "/pair"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                device_id: deviceId,
                                pairing_token: t,
                                operator_alias: alias,
                            }),
                        })];
                case 2:
                    res = _g.sent();
                    return [4 /*yield*/, res.text()];
                case 3:
                    raw = _g.sent();
                    data = {};
                    try {
                        data = raw ? JSON.parse(raw) : {};
                    }
                    catch (_h) {
                        data = {};
                    }
                    if (!res.ok) {
                        console.info("[pair.mobile] failed", {
                            status: res.status,
                            code: (_c = data.code) !== null && _c !== void 0 ? _c : null,
                            error: (_d = data.error) !== null && _d !== void 0 ? _d : raw,
                        });
                        if (res.status === 401 && data.code === "PAIRING_TOKEN_EXPIRED") {
                            setError("Token expirado. Gere um novo QR no desktop e tente novamente.");
                            return [2 /*return*/];
                        }
                        if (res.status === 401 && data.code === "PAIRING_TOKEN_INVALID") {
                            setError("Token invalido. Gere um novo QR no desktop e tente novamente.");
                            return [2 /*return*/];
                        }
                        if (res.status === 400 && data.code === "OPERATOR_ALIAS_REQUIRED") {
                            setError("Informe o nome do operador para concluir o pareamento.");
                            return [2 /*return*/];
                        }
                        setError((_e = data.error) !== null && _e !== void 0 ? _e : "Erro ".concat(res.status));
                        return [2 /*return*/];
                    }
                    if (!data.access_token) {
                        console.info("[pair.mobile] failed", {
                            status: res.status,
                            code: (_f = data.code) !== null && _f !== void 0 ? _f : null,
                            error: "missing_access_token",
                        });
                        setError("Resposta invalida do servidor.");
                        return [2 /*return*/];
                    }
                    console.info("[pair.mobile] success", {
                        deviceId: deviceId,
                        baseUrl: base,
                    });
                    return [4 /*yield*/, setConnection(base, data.access_token, deviceId)];
                case 4:
                    _g.sent();
                    router.replace("/(drawer)");
                    return [3 /*break*/, 7];
                case 5:
                    e_1 = _g.sent();
                    console.info("[pair.mobile] failed", {
                        error: e_1 instanceof Error ? e_1.message : String(e_1),
                    });
                    setError(e_1 instanceof Error ? e_1.message : "Falha ao conectar.");
                    return [3 /*break*/, 7];
                case 6:
                    pairingInFlightRef.current = false;
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); }, [operatorAlias, router, setConnection]);
    var handleBarcodeScanned = (0, react_1.useCallback)(function (_a) {
        var data = _a.data;
        if (pairingInFlightRef.current || loading)
            return;
        var parsed = parsePairingUrl(data);
        if (parsed) {
            setShowScanner(false);
            setBaseUrl(parsed.baseUrl);
            setPairingToken(parsed.token);
            void doPair(parsed.baseUrl, parsed.token);
        }
        else {
            setError("QR invalido. Escaneie o QR exibido no desktop.");
        }
    }, [doPair, loading]);
    if (showScanner) {
        if (!permission) {
            return (<ui_tamagui_1.ScreenContainer mode="static">
          <react_native_1.View style={{ padding: 16, paddingTop: 24 }}>
            <react_native_1.Text style={{ color: "#6b7280" }}>Verificando permissao da camera...</react_native_1.Text>
          </react_native_1.View>
        </ui_tamagui_1.ScreenContainer>);
        }
        if (!permission.granted) {
            return (<ui_tamagui_1.ScreenContainer mode="static">
          <react_native_1.View style={{ padding: 16, paddingTop: 24, flex: 1 }}>
            <pair_1.PermissionPrompt title="Acesso a camera" description="Necessario para escanear o QR code exibido no app desktop." onConfirm={requestPermission} onBack={function () { return setShowScanner(false); }}/>
          </react_native_1.View>
        </ui_tamagui_1.ScreenContainer>);
        }
        return (<react_native_1.View style={{ flex: 1, backgroundColor: "black" }}>
        <expo_camera_1.CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{
                barcodeTypes: ["qr"],
            }} onBarcodeScanned={handleBarcodeScanned}/>
        <pair_1.QrScannerOverlay description={loading
                ? "Conectando ao desktop..."
                : "Aponte para o QR code na tela do desktop"} onCancel={function () { return setShowScanner(false); }}/>
        {error ? (<react_native_1.View style={{
                    position: "absolute",
                    top: 32,
                    left: 16,
                    right: 16,
                    borderRadius: 12,
                    backgroundColor: "rgba(220,38,38,0.95)",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                }}>
            <react_native_1.Text style={{ color: "white", fontSize: 13 }}>{error}</react_native_1.Text>
          </react_native_1.View>) : null}
      </react_native_1.View>);
    }
    return (<ui_tamagui_1.ScreenContainer mode="scroll">
      <react_native_1.View style={{ padding: 16, paddingTop: 24, flex: 1, backgroundColor: "#ffffff" }}>
        <react_native_1.Text style={{ fontSize: 24, fontWeight: "600", color: "#111827", marginBottom: 4 }}>
          Parear com o Desktop
        </react_native_1.Text>
        <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
          Escaneie o QR no desktop ou informe URL e token manualmente.
        </react_native_1.Text>

        <pair_1.PairingTipsCard />
        <react_native_1.Text style={{ color: "#111827", fontWeight: "600", fontSize: 16, marginBottom: 4 }}>
          Modo de pareamento
        </react_native_1.Text>
        <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>
          Escolha como deseja conectar
        </react_native_1.Text>
        <pair_1.PairingMethodTabs method={pairMethod} onChange={setPairMethod}/>

        {pairMethod === "qr" ? (<react_native_1.View style={{ marginBottom: 24 }}>
            <react_native_1.Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 6 }}>
              Nome do operador
            </react_native_1.Text>
            <ui_tamagui_1.Input placeholder="Ex: Posto 1 - Ana" value={operatorAlias} onChangeText={setOperatorAlias} autoCorrect={false} style={{ marginBottom: 16, minHeight: 48 }}/>
            <ui_tamagui_1.Button isDisabled={loading} onPress={function () { return setShowScanner(true); }}>
              {loading ? "Conectando..." : "Escanear QR code"}
            </ui_tamagui_1.Button>
            {error ? (<react_native_1.Text style={{ color: "#dc2626", fontSize: 14, marginTop: 12 }}>
                {error}
              </react_native_1.Text>) : null}
          </react_native_1.View>) : (<pair_1.ManualPairForm baseUrl={baseUrl} pairingToken={pairingToken} operatorAlias={operatorAlias} onChangeBaseUrl={setBaseUrl} onChangeToken={setPairingToken} onChangeOperatorAlias={setOperatorAlias} onSubmit={function () { return doPair(baseUrl, pairingToken); }} loading={loading} error={error}/>)}
      </react_native_1.View>
    </ui_tamagui_1.ScreenContainer>);
}
