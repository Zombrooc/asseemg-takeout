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
exports.ConfirmTakeoutModal = ConfirmTakeoutModal;
var ui_tamagui_1 = require("@/components/ui-tamagui");
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var format_date_1 = require("@/lib/format-date");
var takeout_api_1 = require("@/lib/takeout-api");
var takeout_retirante_payload_1 = require("@/lib/takeout-retirante-payload");
var takeout_queue_1 = require("@/lib/takeout-queue");
var responsive_1 = require("@/utils/responsive");
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var tamagui_1 = require("tamagui");
var confirm_takeout_modal_layout_1 = require("@/components/mobile/audit/confirm-takeout-modal.layout");
var LOCK_RENEW_INTERVAL_MS = 15000;
function formatBirthDate(s) {
    return (0, format_date_1.formatDateBR)(s);
}
function ageFromBirthDate(s) {
    if (!s)
        return "-";
    var d = new Date(s);
    if (Number.isNaN(d.getTime()))
        return "-";
    var now = new Date();
    var age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
        age--;
    }
    return age >= 0 ? String(age) : "-";
}
function formatResponseValue(value) {
    if (value == null)
        return "-";
    if (typeof value === "string" || typeof value === "number")
        return String(value);
    if (typeof value === "boolean")
        return value ? "Sim" : "Nao";
    try {
        return JSON.stringify(value);
    }
    catch (_a) {
        return "-";
    }
}
function buildTicketConflictKey(participant, sourceType) {
    if (sourceType === "legacy_csv")
        return participant.id;
    return participant.ticketId;
}
function ConfirmTakeoutModal(_a) {
    var _this = this;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    var visible = _a.visible, participant = _a.participant, _p = _a.alerts, alerts = _p === void 0 ? [] : _p, _q = _a.sourceType, sourceType = _q === void 0 ? "json_sync" : _q, eventId = _a.eventId, onClose = _a.onClose, onConfirmed = _a.onConfirmed, onQueuedOffline = _a.onQueuedOffline, onConflict = _a.onConflict;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var _r = (0, responsive_1.useResponsiveScale)(), scale = _r.scale, width = _r.width;
    var windowHeight = (0, react_native_1.useWindowDimensions)().height;
    var _s = (0, takeout_connection_context_1.useTakeoutConnection)(), api = _s.api, deviceId = _s.deviceId;
    var _t = (0, react_1.useState)(false), loading = _t[0], setLoading = _t[1];
    var _u = (0, react_1.useState)(null), error = _u[0], setError = _u[1];
    var _v = (0, react_1.useState)(false), isProxyTakeout = _v[0], setIsProxyTakeout = _v[1];
    var _w = (0, react_1.useState)(""), retiranteNome = _w[0], setRetiranteNome = _w[1];
    var _x = (0, react_1.useState)(""), retiranteCpf = _x[0], setRetiranteCpf = _x[1];
    var _y = (0, react_1.useState)(null), lockState = _y[0], setLockState = _y[1];
    var _z = (0, react_1.useState)(0), keyboardHeight = _z[0], setKeyboardHeight = _z[1];
    var _0 = (0, react_1.useState)(false), isKeyboardVisible = _0[0], setIsKeyboardVisible = _0[1];
    var renewIntervalRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!visible)
            return;
        setError(null);
        setIsProxyTakeout(false);
        setRetiranteNome("");
        setRetiranteCpf("");
    }, [visible, participant === null || participant === void 0 ? void 0 : participant.id]);
    (0, react_1.useEffect)(function () {
        if (!visible) {
            setKeyboardHeight(0);
            setIsKeyboardVisible(false);
            return;
        }
        var showEvent = react_native_1.Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        var hideEvent = react_native_1.Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        var handleKeyboardShow = function (event) {
            var _a, _b;
            setKeyboardHeight((_b = (_a = event.endCoordinates) === null || _a === void 0 ? void 0 : _a.height) !== null && _b !== void 0 ? _b : 0);
            setIsKeyboardVisible(true);
        };
        var handleKeyboardHide = function () {
            setKeyboardHeight(0);
            setIsKeyboardVisible(false);
        };
        var showSubscription = react_native_1.Keyboard.addListener(showEvent, handleKeyboardShow);
        var hideSubscription = react_native_1.Keyboard.addListener(hideEvent, handleKeyboardHide);
        return function () {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [visible]);
    (0, react_1.useEffect)(function () {
        if (!visible || !participant || !api || !deviceId) {
            setLockState(null);
            return;
        }
        var cancelled = false;
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, api.postLocksAcquire(participant.id, deviceId)];
                    case 1:
                        _a.sent();
                        if (cancelled)
                            return [2 /*return*/];
                        setLockState("heldByMe");
                        renewIntervalRef.current = setInterval(function () {
                            api.postLocksRenew(participant.id, deviceId).catch(function () { });
                        }, LOCK_RENEW_INTERVAL_MS);
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        if (cancelled)
                            return [2 /*return*/];
                        if (e_1 instanceof takeout_api_1.TakeoutApiError && e_1.status === 409) {
                            setLockState("heldByOther");
                        }
                        else {
                            setLockState(null);
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); })();
        return function () {
            cancelled = true;
            if (renewIntervalRef.current) {
                clearInterval(renewIntervalRef.current);
                renewIntervalRef.current = null;
            }
            if (participant && api && deviceId) {
                api.deleteLocksRelease(participant.id, deviceId).catch(function () { });
            }
        };
    }, [visible, participant === null || participant === void 0 ? void 0 : participant.id, api, deviceId]);
    var handleClose = function () {
        if (participant && api && deviceId && lockState === "heldByMe") {
            api.deleteLocksRelease(participant.id, deviceId).catch(function () { });
        }
        setLockState(null);
        onClose();
    };
    var handleConfirm = function () { return __awaiter(_this, void 0, void 0, function () {
        var proxyPayload, proxyPayloadJson, requestId, res, _a, e_2, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    // #region agent log
                    fetch("http://127.0.0.1:7496/ingest/1028bdca-7037-4a64-896c-a6cc5ba2298a", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Debug-Session-Id": "a61d58",
                        },
                        body: JSON.stringify({
                            sessionId: "a61d58",
                            runId: "initial",
                            hypothesisId: "syntax_or_runtime",
                            location: "confirm-takeout-modal.tsx:handleConfirm",
                            message: "ConfirmTakeoutModal handleConfirm called",
                            data: {
                                participantId: (_c = participant === null || participant === void 0 ? void 0 : participant.id) !== null && _c !== void 0 ? _c : null,
                                sourceType: sourceType,
                                deviceId: deviceId !== null && deviceId !== void 0 ? deviceId : null,
                            },
                            timestamp: Date.now(),
                        }),
                    }).catch(function () { });
                    // #endregion
                    if (!participant || !api || !deviceId)
                        return [2 /*return*/];
                    if (sourceType === "legacy_csv" && !eventId) {
                        setError("Event ID ausente para confirmacao legado.");
                        return [2 /*return*/];
                    }
                    proxyPayload = (0, takeout_retirante_payload_1.buildTakeoutRetirantePayload)({
                        isProxyTakeout: isProxyTakeout,
                        retiranteNome: retiranteNome,
                        retiranteCpf: retiranteCpf,
                    });
                    if (isProxyTakeout && !proxyPayload) {
                        setError("Informe o nome do retirante.");
                        return [2 /*return*/];
                    }
                    proxyPayloadJson = (0, takeout_retirante_payload_1.buildTakeoutRetirantePayloadJson)({
                        isProxyTakeout: isProxyTakeout,
                        retiranteNome: retiranteNome,
                        retiranteCpf: retiranteCpf,
                    });
                    setError(null);
                    setLoading(true);
                    requestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                        var r = (Math.random() * 16) | 0;
                        var v = c === "x" ? r : (r & 0x3) | 0x8;
                        return v.toString(16);
                    });
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 6, 11, 12]);
                    if (!(sourceType === "legacy_csv")) return [3 /*break*/, 3];
                    return [4 /*yield*/, api.postLegacyTakeoutConfirm({
                            request_id: requestId,
                            event_id: eventId,
                            participant_id: participant.id,
                            device_id: deviceId,
                            payload_json: proxyPayloadJson,
                        })];
                case 2:
                    _a = _d.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, api.postTakeoutConfirm({
                        request_id: requestId,
                        ticket_id: participant.ticketId,
                        device_id: deviceId,
                        payload_json: proxyPayloadJson,
                    })];
                case 4:
                    _a = _d.sent();
                    _d.label = 5;
                case 5:
                    res = _a;
                    if (res.status === "CONFIRMED" || res.status === "DUPLICATE") {
                        api.deleteLocksRelease(participant.id, deviceId).catch(function () { });
                        onConfirmed();
                        onClose();
                    }
                    else {
                        setError("Resposta inesperada: ".concat(res.status));
                    }
                    return [3 /*break*/, 12];
                case 6:
                    e_2 = _d.sent();
                    if (e_2 instanceof takeout_api_1.TakeoutApiError && e_2.status === 409) {
                        onClose();
                        onConflict === null || onConflict === void 0 ? void 0 : onConflict(buildTicketConflictKey(participant, sourceType));
                        react_native_1.Alert.alert("Conflito", "Check-in ja realizado por outro dispositivo.");
                        return [2 /*return*/];
                    }
                    if (sourceType === "legacy_csv") {
                        react_native_1.Alert.alert("Erro", "Falha ao confirmar retirada no legado.");
                        return [2 /*return*/];
                    }
                    _d.label = 7;
                case 7:
                    _d.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, (0, takeout_queue_1.addToQueue)({
                            request_id: requestId,
                            ticket_id: participant.ticketId,
                            device_id: deviceId,
                            payload_json: proxyPayloadJson,
                        })];
                case 8:
                    _d.sent();
                    onQueuedOffline === null || onQueuedOffline === void 0 ? void 0 : onQueuedOffline();
                    return [3 /*break*/, 10];
                case 9:
                    _b = _d.sent();
                    return [3 /*break*/, 10];
                case 10:
                    onClose();
                    return [3 /*break*/, 12];
                case 11:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    }); };
    if (!participant)
        return null;
    var legacy = sourceType === "legacy_csv" ? participant : null;
    var current = sourceType === "json_sync" ? participant : null;
    var isLockedByOther = lockState === "heldByOther";
    var isRetiranteNomeValid = !isProxyTakeout ||
        (0, takeout_retirante_payload_1.buildTakeoutRetirantePayload)({
            isProxyTakeout: isProxyTakeout,
            retiranteNome: retiranteNome,
            retiranteCpf: retiranteCpf,
        }) != null;
    var canConfirm = !isLockedByOther && isRetiranteNomeValid;
    var modalLayout = (0, confirm_takeout_modal_layout_1.getConfirmTakeoutModalLayout)({
        windowHeight: windowHeight,
        keyboardHeight: keyboardHeight,
        isKeyboardVisible: isKeyboardVisible,
        insets: { top: insets.top, bottom: insets.bottom },
    });
    return (<react_native_1.Modal visible={visible} transparent animationType="fade">
      <react_native_1.Pressable style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
        }} onPress={handleClose}>
        <react_native_1.KeyboardAvoidingView style={{ flex: 1, width: "100%" }} behavior={react_native_1.Platform.OS === "ios" ? "padding" : "height"}>
          <react_native_1.ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{
            flexGrow: 1,
            justifyContent: modalLayout.justifyContent,
            alignItems: "center",
            paddingTop: modalLayout.paddingTop,
            paddingBottom: modalLayout.paddingBottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingHorizontal: scale(16),
        }}>
            <react_native_1.Pressable style={{ width: "90%", maxWidth: width * 0.9, maxHeight: modalLayout.cardMaxHeight }} onPress={function (e) { return e.stopPropagation(); }}>
              <ui_tamagui_1.Card style={{ padding: 24 }}>
                <tamagui_1.Text fontSize={18} fontWeight="600" color="$foreground">
                  Confirmar check-in
                </tamagui_1.Text>
                {alerts.length > 0 ? (<tamagui_1.YStack testID="takeout-confirm-modal-alerts" gap="$2" style={{
                marginTop: 12,
                marginBottom: 16,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#fecaca",
                backgroundColor: "#fef2f2",
            }}>
                    <tamagui_1.Text color="#b91c1c" fontSize={14} fontWeight="600">
                      Alertas para este participante
                    </tamagui_1.Text>
                    {alerts.map(function (alert) { return (<tamagui_1.Text key={"".concat(participant.id, "-").concat(alert.code, "-").concat(alert.message)} color="#b91c1c" fontSize={13}>
                        {alert.message}
                      </tamagui_1.Text>); })}
                  </tamagui_1.YStack>) : null}
                {lockState === "heldByMe" ? (<tamagui_1.Text color="$textSecondary" fontSize={14}>
                    Em atendimento por voce
                  </tamagui_1.Text>) : isLockedByOther ? (<tamagui_1.Text color="$warning" fontSize={14}>
                    Em atendimento por outro dispositivo
                  </tamagui_1.Text>) : null}
                <tamagui_1.YStack gap="$2" style={{ marginBottom: 16 }}>
                  <Row label="Nome" value={(_c = ((_b = legacy === null || legacy === void 0 ? void 0 : legacy.name) !== null && _b !== void 0 ? _b : current === null || current === void 0 ? void 0 : current.name)) !== null && _c !== void 0 ? _c : "-"}/>
                  <Row label="CPF" value={(_e = ((_d = legacy === null || legacy === void 0 ? void 0 : legacy.cpf) !== null && _d !== void 0 ? _d : current === null || current === void 0 ? void 0 : current.cpf)) !== null && _e !== void 0 ? _e : "-"}/>
                  <Row label="Data de nascimento" value={formatBirthDate((_f = legacy === null || legacy === void 0 ? void 0 : legacy.birthDate) !== null && _f !== void 0 ? _f : current === null || current === void 0 ? void 0 : current.birthDate)}/>
                  <Row label="Idade" value={ageFromBirthDate((_g = legacy === null || legacy === void 0 ? void 0 : legacy.birthDate) !== null && _g !== void 0 ? _g : current === null || current === void 0 ? void 0 : current.birthDate)}/>
                  <Row label="Ingresso" value={legacy != null ? "#".concat(legacy.bibNumber) : ((_j = ((_h = current === null || current === void 0 ? void 0 : current.sourceTicketId) !== null && _h !== void 0 ? _h : current === null || current === void 0 ? void 0 : current.ticketId)) !== null && _j !== void 0 ? _j : "-")}/>
                  <Row label="Tipo de ingresso" value={(_l = ((_k = legacy === null || legacy === void 0 ? void 0 : legacy.modality) !== null && _k !== void 0 ? _k : current === null || current === void 0 ? void 0 : current.ticketName)) !== null && _l !== void 0 ? _l : "-"}/>
                  <Row label="Tamanho da camisa" value={(_m = legacy === null || legacy === void 0 ? void 0 : legacy.shirtSize) !== null && _m !== void 0 ? _m : "-"}/>
                  <Row label="Equipe" value={(_o = legacy === null || legacy === void 0 ? void 0 : legacy.team) !== null && _o !== void 0 ? _o : "-"}/>
                </tamagui_1.YStack>
                {(current === null || current === void 0 ? void 0 : current.customFormResponses) && current.customFormResponses.length > 0 ? (<tamagui_1.YStack gap="$2" style={{ marginBottom: 16 }}>
                    <tamagui_1.Text color="$textSecondary" fontSize={12} fontWeight="500">
                      Dados adicionais
                    </tamagui_1.Text>
                    <tamagui_1.YStack gap="$2">
                      {current.customFormResponses.map(function (r, i) { return (<Row key={i} label={r.label || r.name} value={formatResponseValue(r.response)}/>); })}
                    </tamagui_1.YStack>
                  </tamagui_1.YStack>) : null}
                <tamagui_1.YStack gap="$2" style={{ marginBottom: 16 }}>
                  <tamagui_1.Text color="$textSecondary" fontSize={12} fontWeight="500">
                    Retirante
                  </tamagui_1.Text>
                  <ui_tamagui_1.Button testID="takeout-confirm-modal-proxy-toggle" variant={isProxyTakeout ? "secondary" : "bordered"} onPress={function () { return setIsProxyTakeout(function (prev) { return !prev; }); }} isDisabled={loading}>
                    {isProxyTakeout ? "Retirada por terceiro: Sim" : "Retirada por terceiro: Nao"}
                  </ui_tamagui_1.Button>
                  {isProxyTakeout ? (<tamagui_1.YStack gap="$2">
                      <ui_tamagui_1.Input testID="takeout-confirm-modal-retirante-nome" value={retiranteNome} onChangeText={setRetiranteNome} placeholder="Nome do retirante" autoCapitalize="words" editable={!loading}/>
                      <ui_tamagui_1.Input testID="takeout-confirm-modal-retirante-cpf" value={retiranteCpf} onChangeText={setRetiranteCpf} placeholder="CPF do retirante (opcional)" keyboardType="number-pad" editable={!loading}/>
                      {!isRetiranteNomeValid ? (<tamagui_1.Text color="$danger" fontSize={12}>
                          Nome do retirante e obrigatorio.
                        </tamagui_1.Text>) : null}
                    </tamagui_1.YStack>) : null}
                </tamagui_1.YStack>
                {error ? (<tamagui_1.Text color="$danger" fontSize={14}>
                    {error}
                  </tamagui_1.Text>) : null}
                <tamagui_1.XStack gap="$3">
                  <ui_tamagui_1.Button testID="takeout-confirm-modal-cancel" variant="bordered" onPress={handleClose} isDisabled={loading}>
                    Cancelar
                  </ui_tamagui_1.Button>
                  <ui_tamagui_1.Button testID="takeout-confirm-modal-confirm" onPress={handleConfirm} isLoading={loading} isDisabled={loading || !canConfirm}>
                    Confirmar check-in
                  </ui_tamagui_1.Button>
                </tamagui_1.XStack>
              </ui_tamagui_1.Card>
            </react_native_1.Pressable>
          </react_native_1.ScrollView>
        </react_native_1.KeyboardAvoidingView>
      </react_native_1.Pressable>
    </react_native_1.Modal>);
}
function Row(_a) {
    var label = _a.label, value = _a.value;
    return (<tamagui_1.XStack style={{ justifyContent: "space-between" }}>
      <tamagui_1.Text color="$textSecondary" fontSize={14}>
        {label}
      </tamagui_1.Text>
      <tamagui_1.Text color="$foreground" fontSize={14}>
        {value}
      </tamagui_1.Text>
    </tamagui_1.XStack>);
}
