"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParticipantBirthDate = getParticipantBirthDate;
exports.ConfirmTakeoutModal = ConfirmTakeoutModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const ui_tamagui_1 = require("@/components/ui-tamagui");
const Ionicons_1 = __importDefault(require("@expo/vector-icons/Ionicons"));
const takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
const format_date_1 = require("@/lib/format-date");
const takeout_api_1 = require("@/lib/takeout-api");
const takeout_retirante_payload_1 = require("@/lib/takeout-retirante-payload");
const takeout_queue_1 = require("@/lib/takeout-queue");
const confirm_takeout_modal_data_1 = require("@/components/mobile/audit/confirm-takeout-modal.data");
const react_1 = require("react");
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const tamagui_1 = require("tamagui");
const LOCK_RENEW_INTERVAL_MS = 15_000;
function formatBirthDate(s) {
    return (0, format_date_1.formatDateBR)(s);
}
function getParticipantBirthDate(participant) {
    const raw = participant;
    return participant.birthDate ?? raw.birth_date ?? raw.dataNascimento ?? null;
}
function ageFromBirthDate(s) {
    if (!s)
        return "-";
    const d = (0, format_date_1.parseDateValue)(s);
    if (!d)
        return "-";
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() ||
        (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
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
    catch {
        return "-";
    }
}
function buildTicketConflictKey(participant, sourceType) {
    if (sourceType === "legacy_csv")
        return participant.id;
    return participant.ticketId;
}
function ConfirmTakeoutModal({ visible, participant, readOnly = false, alerts = [], sourceType = "json_sync", eventId, onClose, onConfirmed, onQueuedOffline, onConflict, }) {
    const insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    const theme = (0, tamagui_1.useTheme)();
    const closeIconColor = theme.foreground.get();
    const { api, deviceId } = (0, takeout_connection_context_1.useTakeoutConnection)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [isProxyTakeout, setIsProxyTakeout] = (0, react_1.useState)(false);
    const [retiranteNome, setRetiranteNome] = (0, react_1.useState)("");
    const [retiranteCpf, setRetiranteCpf] = (0, react_1.useState)("");
    const [lockState, setLockState] = (0, react_1.useState)(null);
    const renewIntervalRef = (0, react_1.useRef)(null);
    const submittingRef = (0, react_1.useRef)(false);
    const participantId = participant?.id;
    (0, react_1.useEffect)(() => {
        if (!visible || !participantId)
            return;
        setError(null);
        setLoading(false);
        submittingRef.current = false;
        setIsProxyTakeout(false);
        setRetiranteNome("");
        setRetiranteCpf("");
    }, [visible, participantId]);
    (0, react_1.useEffect)(() => {
        if (readOnly || !visible || !participantId || !api || !deviceId) {
            setLockState(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                await api.postLocksAcquire(participantId, deviceId);
                if (cancelled)
                    return;
                setLockState("heldByMe");
                renewIntervalRef.current = setInterval(() => {
                    api.postLocksRenew(participantId, deviceId).catch(() => { });
                }, LOCK_RENEW_INTERVAL_MS);
            }
            catch (e) {
                if (cancelled)
                    return;
                if (e instanceof takeout_api_1.TakeoutApiError && e.status === 409) {
                    setLockState("heldByOther");
                }
                else {
                    setLockState(null);
                }
            }
        })();
        return () => {
            cancelled = true;
            if (renewIntervalRef.current) {
                clearInterval(renewIntervalRef.current);
                renewIntervalRef.current = null;
            }
            if (api && deviceId) {
                api.deleteLocksRelease(participantId, deviceId).catch(() => { });
            }
        };
    }, [visible, participantId, api, deviceId, readOnly]);
    const handleClose = () => {
        if (loading || submittingRef.current)
            return;
        if (participantId && api && deviceId && lockState === "heldByMe") {
            api.deleteLocksRelease(participantId, deviceId).catch(() => { });
        }
        setLockState(null);
        onClose();
    };
    const handleConfirm = async () => {
        if (submittingRef.current)
            return;
        if (readOnly || !participant || !api || !deviceId)
            return;
        if (sourceType === "legacy_csv" && !eventId) {
            setError("Event ID ausente para confirmacao legado.");
            return;
        }
        const proxyPayload = (0, takeout_retirante_payload_1.buildTakeoutRetirantePayload)({
            isProxyTakeout,
            retiranteNome,
            retiranteCpf,
        });
        if (isProxyTakeout && !proxyPayload) {
            setError("Informe o nome do retirante.");
            return;
        }
        const proxyPayloadJson = (0, takeout_retirante_payload_1.buildTakeoutRetirantePayloadJson)({
            isProxyTakeout,
            retiranteNome,
            retiranteCpf,
        });
        setError(null);
        submittingRef.current = true;
        setLoading(true);
        const requestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        try {
            const res = sourceType === "legacy_csv"
                ? await api.postLegacyTakeoutConfirm({
                    request_id: requestId,
                    event_id: eventId ?? "",
                    participant_id: participant.id,
                    device_id: deviceId,
                    payload_json: proxyPayloadJson,
                })
                : await api.postTakeoutConfirm({
                    request_id: requestId,
                    ticket_id: participant.ticketId,
                    device_id: deviceId,
                    payload_json: proxyPayloadJson,
                });
            if (res.status === "CONFIRMED" || res.status === "DUPLICATE") {
                api.deleteLocksRelease(participant.id, deviceId).catch(() => { });
                onConfirmed();
                onClose();
            }
            else {
                setError(`Resposta inesperada: ${res.status}`);
            }
        }
        catch (e) {
            if (e instanceof takeout_api_1.TakeoutApiError && e.status === 409) {
                onClose();
                onConflict?.(buildTicketConflictKey(participant, sourceType));
                react_native_1.Alert.alert("Conflito", "Check-in ja realizado por outro dispositivo.");
                return;
            }
            if (sourceType === "legacy_csv") {
                react_native_1.Alert.alert("Erro", "Falha ao confirmar retirada no legado.");
                return;
            }
            try {
                await (0, takeout_queue_1.addToQueue)({
                    request_id: requestId,
                    ticket_id: participant.ticketId,
                    device_id: deviceId,
                    payload_json: proxyPayloadJson,
                });
                onQueuedOffline?.();
            }
            catch {
                // ignore queue persist failure
            }
            onClose();
        }
        finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };
    if (!participant)
        return null;
    const current = sourceType === "json_sync" ? participant : null;
    const isLockedByOther = lockState === "heldByOther";
    const isRetiranteNomeValid = !isProxyTakeout ||
        (0, takeout_retirante_payload_1.buildTakeoutRetirantePayload)({
            isProxyTakeout,
            retiranteNome,
            retiranteCpf,
        }) != null;
    const canConfirm = !isLockedByOther && isRetiranteNomeValid;
    const birthDate = getParticipantBirthDate(participant);
    const { name: participantName, cpf: participantCpf, ticketType, shirtSize, bibNumber, ticketIdentifier, team, } = (0, confirm_takeout_modal_data_1.getTakeoutModalParticipantDetails)(participant, sourceType);
    const serviceLabel = readOnly
        ? "Atendimento concluído"
        : isLockedByOther
            ? "Em atendimento por outro dispositivo"
            : lockState === "heldByMe"
                ? "Em atendimento por você"
                : "Validando atendimento";
    const statusLabel = readOnly
        ? "CHECK-IN REALIZADO"
        : isLockedByOther
            ? "ATENDIMENTO INDISPONÍVEL"
            : lockState === "heldByMe"
                ? "CHECK-IN PENDENTE"
                : "VALIDANDO ATENDIMENTO";
    return ((0, jsx_runtime_1.jsx)(react_native_1.Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: handleClose, children: (0, jsx_runtime_1.jsx)(react_native_1.KeyboardAvoidingView, { style: { flex: 1 }, behavior: react_native_1.Platform.OS === "ios" ? "padding" : "height", children: (0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { flex: 1, backgroundColor: "$background", children: [(0, jsx_runtime_1.jsx)(react_native_1.Pressable, { accessibilityLabel: "Fechar confer\u00EAncia", onPress: handleClose, style: {
                            ...{ position: "absolute", inset: 0 },
                            backgroundColor: "rgba(0,0,0,0.5)",
                        } }), (0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { flex: 1, backgroundColor: "$background", accessibilityViewIsModal: true, style: { width: "100%", maxWidth: 640, alignSelf: "center" }, children: [(0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { borderBottomWidth: 1, borderColor: "$border", backgroundColor: "$background", style: { paddingTop: insets.top }, children: [(0, jsx_runtime_1.jsxs)(tamagui_1.XStack, { gap: "$2", style: { paddingHorizontal: 12, paddingVertical: 8, alignItems: "flex-start" }, children: [(0, jsx_runtime_1.jsx)(react_native_1.Pressable, { testID: "takeout-confirm-modal-close", accessibilityRole: "button", accessibilityLabel: "Fechar confer\u00EAncia", onPress: handleClose, disabled: loading, style: ({ pressed }) => ({
                                                    width: 44,
                                                    height: 44,
                                                    minWidth: 44,
                                                    minHeight: 44,
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    opacity: loading ? 0.5 : pressed ? 0.7 : 1,
                                                }), children: (0, jsx_runtime_1.jsx)(Ionicons_1.default, { name: "close", size: 26, color: closeIconColor }) }), (0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { flex: 1, gap: "$1", style: { paddingTop: 4 }, children: [(0, jsx_runtime_1.jsx)(tamagui_1.Text, { accessibilityRole: "header", accessibilityHint: readOnly ? "Dados do participante" : "Confirmar check-in", fontSize: 23, fontWeight: "800", color: "$foreground", children: "Confer\u00EAncia do kit" }), (0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 14, children: "Confira antes de entregar ao participante" })] })] }), (0, jsx_runtime_1.jsxs)(tamagui_1.XStack, { gap: "$2", style: { paddingHorizontal: 16, paddingBottom: 12, alignItems: "center" }, children: [(0, jsx_runtime_1.jsx)(StatusChip, { label: serviceLabel, tone: isLockedByOther ? "warning" : "neutral" }), (0, jsx_runtime_1.jsx)(StatusChip, { label: statusLabel, tone: readOnly ? "success" : isLockedByOther ? "danger" : "accent" })] })] }), (0, jsx_runtime_1.jsxs)(react_native_1.ScrollView, { style: { flex: 1 }, keyboardShouldPersistTaps: "handled", keyboardDismissMode: "on-drag", contentContainerStyle: { padding: 16, paddingBottom: 24, gap: 20 }, children: [alerts.length > 0 ? ((0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { testID: "takeout-confirm-modal-alerts", gap: "$2", borderWidth: 1, borderColor: "$danger", backgroundColor: "$card", accessibilityRole: "alert", style: { padding: 12, borderRadius: 16 }, children: [(0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$danger", fontSize: 14, fontWeight: "700", children: "Alertas para este participante" }), alerts.map((alert) => ((0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$danger", fontSize: 13, children: alert.message }, `${participant.id}-${alert.code}-${alert.message}`)))] })) : null, (0, jsx_runtime_1.jsxs)(ui_tamagui_1.Card, { backgroundColor: "$card", borderColor: "$border", testID: "takeout-confirm-modal-participant", style: { padding: 16, borderRadius: 20 }, children: [(0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 12, fontWeight: "700", children: "Nome do participante" }), (0, jsx_runtime_1.jsx)(tamagui_1.Text, { selectable: true, color: "$foreground", fontSize: 24, lineHeight: 29, fontWeight: "800", style: { marginTop: 4 }, children: participantName }), (0, jsx_runtime_1.jsxs)(tamagui_1.XStack, { gap: "$2", borderTopWidth: 1, borderColor: "$border", style: { marginTop: 12, paddingTop: 12 }, children: [(0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 13, fontWeight: "700", children: "CPF" }), (0, jsx_runtime_1.jsx)(tamagui_1.Text, { selectable: true, color: "$foreground", fontSize: 15, fontWeight: "600", flex: 1, children: participantCpf })] })] }), (0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { gap: "$3", children: [(0, jsx_runtime_1.jsx)(SectionTitle, { children: "Conferir no kit f\u00EDsico" }), (0, jsx_runtime_1.jsxs)(tamagui_1.XStack, { testID: "takeout-confirm-modal-kit-cards", gap: "$2", style: { alignItems: "stretch" }, children: [(0, jsx_runtime_1.jsx)(KitCard, { label: "Ingresso", value: ticketType }), (0, jsx_runtime_1.jsx)(KitCard, { label: "Tamanho da camisa", value: shirtSize }), (0, jsx_runtime_1.jsx)(KitCard, { label: "N\u00FAmero de peito", value: bibNumber })] })] }), (0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { gap: "$3", children: [(0, jsx_runtime_1.jsx)(SectionTitle, { children: "Dados do participante" }), (0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { borderWidth: 1, borderColor: "$border", overflow: "hidden", backgroundColor: "$card", style: { borderRadius: 16 }, children: [(0, jsx_runtime_1.jsx)(Row, { label: "Data de nascimento", value: formatBirthDate(birthDate) }), (0, jsx_runtime_1.jsx)(Row, { label: "Idade", value: ageFromBirthDate(birthDate) }), (0, jsx_runtime_1.jsx)(Row, { label: "Equipe", value: team, isLast: !current }), current ? (0, jsx_runtime_1.jsx)(Row, { label: "Identifica\u00E7\u00E3o do ingresso", value: ticketIdentifier, isLast: true }) : null] })] }), current?.customFormResponses && current.customFormResponses.length > 0 ? ((0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { gap: "$3", children: [(0, jsx_runtime_1.jsx)(SectionTitle, { children: "Dados adicionais" }), (0, jsx_runtime_1.jsx)(tamagui_1.YStack, { borderWidth: 1, borderColor: "$border", overflow: "hidden", backgroundColor: "$card", style: { borderRadius: 16 }, children: current.customFormResponses.map((r, i) => ((0, jsx_runtime_1.jsx)(Row, { label: r.label || r.name, value: formatResponseValue(r.response), isLast: i === (current.customFormResponses?.length ?? 0) - 1 }, `${r.name}-${i}`))) })] })) : null, (0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { gap: "$3", children: [(0, jsx_runtime_1.jsx)(SectionTitle, { children: "Retirante" }), (0, jsx_runtime_1.jsx)(ui_tamagui_1.Card, { gap: "$3", backgroundColor: "$card", borderColor: "$border", style: { padding: 16 }, children: readOnly ? ((0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 14, children: "A retirada j\u00E1 foi confirmada. Consulte o hist\u00F3rico de auditoria para os dados do retirante." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(tamagui_1.XStack, { gap: "$3", style: { justifyContent: "space-between", alignItems: "center" }, children: [(0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 14, fontWeight: "700", flex: 1, children: "Retirada por terceiro" }), (0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: isProxyTakeout ? "$warning" : "$foreground", fontSize: 15, fontWeight: "800", children: isProxyTakeout ? "Sim" : "Não" })] }), (0, jsx_runtime_1.jsxs)(tamagui_1.XStack, { gap: "$2", accessibilityRole: "radiogroup", accessibilityLabel: "Quem est\u00E1 retirando o kit?", children: [(0, jsx_runtime_1.jsx)(ui_tamagui_1.Button, { testID: "takeout-confirm-modal-own-toggle", flex: 1, style: { minHeight: 48 }, variant: !isProxyTakeout ? "primary" : "outline", accessibilityRole: "radio", accessibilityState: { selected: !isProxyTakeout, disabled: loading }, onPress: () => setIsProxyTakeout(false), isDisabled: loading, children: "Pr\u00F3prio atleta" }), (0, jsx_runtime_1.jsx)(ui_tamagui_1.Button, { testID: "takeout-confirm-modal-proxy-toggle", flex: 1, style: { minHeight: 48 }, variant: isProxyTakeout ? "primary" : "outline", accessibilityRole: "radio", accessibilityState: { selected: isProxyTakeout, disabled: loading }, onPress: () => setIsProxyTakeout(true), isDisabled: loading, children: "Outra pessoa" })] }), (0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 13, children: isProxyTakeout ? "Retirante: uma terceira pessoa." : "Retirante: o próprio atleta." }), !readOnly ? (isProxyTakeout ? ((0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { gap: "$2", children: [(0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 13, fontWeight: "700", children: "Nome completo do retirante *" }), (0, jsx_runtime_1.jsx)(ui_tamagui_1.Input, { testID: "takeout-confirm-modal-retirante-nome", accessibilityLabel: "Nome completo do retirante", value: retiranteNome, onChangeText: setRetiranteNome, placeholder: "Nome de quem est\u00E1 retirando", autoCapitalize: "words", editable: !loading }), (0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 13, fontWeight: "700", children: "CPF do retirante (opcional)" }), (0, jsx_runtime_1.jsx)(ui_tamagui_1.Input, { testID: "takeout-confirm-modal-retirante-cpf", accessibilityLabel: "CPF do retirante", value: retiranteCpf, onChangeText: setRetiranteCpf, placeholder: "000.000.000-00", keyboardType: "number-pad", editable: !loading }), !isRetiranteNomeValid ? ((0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$danger", fontSize: 12, accessibilityRole: "alert", children: "Nome do retirante e obrigatorio." })) : null] })) : null) : null] })) })] })] }), (0, jsx_runtime_1.jsxs)(tamagui_1.YStack, { borderTopWidth: 1, borderColor: "$border", backgroundColor: "$background", gap: "$2", style: {
                                    paddingHorizontal: 16,
                                    paddingTop: 12,
                                    paddingBottom: Math.max(insets.bottom, 12),
                                }, children: [error ? ((0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$danger", fontSize: 14, accessibilityRole: "alert", children: error })) : null, (0, jsx_runtime_1.jsxs)(tamagui_1.XStack, { gap: "$2", children: [(0, jsx_runtime_1.jsx)(ui_tamagui_1.Button, { testID: "takeout-confirm-modal-cancel", flex: readOnly ? 1 : 0.38, style: { minHeight: 52 }, variant: "bordered", onPress: handleClose, isDisabled: loading, children: "Cancelar" }), !readOnly ? ((0, jsx_runtime_1.jsx)(ui_tamagui_1.Button, { testID: "takeout-confirm-modal-confirm", flex: 1, style: { minHeight: 52 }, onPress: handleConfirm, isLoading: loading, isDisabled: loading || !canConfirm, accessibilityLabel: "Confirmar check-in", children: "Confirmar check-in" })) : null] })] })] })] }) }) }));
}
function SectionTitle({ children }) {
    return ((0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$foreground", fontSize: 16, fontWeight: "800", children: children }));
}
function StatusChip({ label, tone }) {
    const color = tone === "danger" ? "$danger" : tone === "warning" ? "$warning" : tone === "success" ? "$success" : tone === "accent" ? "$accent" : "$textSecondary";
    return ((0, jsx_runtime_1.jsx)(tamagui_1.YStack, { borderWidth: 1, borderColor: color, style: { flexShrink: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }, children: (0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: color, fontSize: 11, fontWeight: "800", numberOfLines: 2, children: label }) }));
}
function KitCard({ label, value }) {
    return ((0, jsx_runtime_1.jsxs)(ui_tamagui_1.Card, { testID: `takeout-confirm-modal-kit-${label.toLowerCase().replaceAll(" ", "-")}`, flex: 1, gap: "$2", backgroundColor: "$card", borderColor: "$border", style: { minWidth: 0, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 16 }, children: [(0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 11, lineHeight: 14, fontWeight: "700", children: label }), (0, jsx_runtime_1.jsx)(tamagui_1.Text, { selectable: true, color: "$foreground", fontSize: 20, lineHeight: 24, fontWeight: "800", accessibilityLabel: `${label}: ${value}`, style: { flexShrink: 1 }, children: value })] }));
}
function Row({ label, value, isLast = false }) {
    return ((0, jsx_runtime_1.jsxs)(tamagui_1.XStack, { gap: "$3", borderBottomWidth: isLast ? 0 : 1, borderColor: "$border", style: { paddingHorizontal: 16, paddingVertical: 12, alignItems: "flex-start" }, children: [(0, jsx_runtime_1.jsx)(tamagui_1.Text, { color: "$textSecondary", fontSize: 14, flex: 1, children: label }), (0, jsx_runtime_1.jsx)(tamagui_1.Text, { selectable: true, color: "$foreground", fontSize: 14, fontWeight: "600", flex: 1, style: { textAlign: "right" }, children: value })] }));
}
