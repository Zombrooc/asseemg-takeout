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
exports.default = EventScreen;
var async_storage_1 = require("@react-native-async-storage/async-storage");
var legacy_participant_alerts_1 = require("@pickup/api/legacy-participant-alerts");
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var expo_router_1 = require("expo-router");
var native_1 = require("@react-navigation/native");
var react_query_1 = require("@tanstack/react-query");
var react_1 = require("react");
var react_native_1 = require("react-native");
var event_1 = require("@/components/mobile-tamagui/event");
var legacy_create_participant_modal_1 = require("@/components/mobile-tamagui/event/legacy-create-participant-modal");
var confirm_takeout_modal_1 = require("@/components/mobile/audit/confirm-takeout-modal");
var participant_list_item_1 = require("@/components/mobile-tamagui/participant-list-item");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var format_date_1 = require("@/lib/format-date");
var takeout_realtime_1 = require("@/lib/takeout-realtime");
var takeout_queue_1 = require("@/lib/takeout-queue");
var expo_camera_1 = require("expo-camera");
var react_native_2 = require("react-native");
var SYNC_LAST_SEQ_KEY = function (eventId) {
    return "takeout_sync_last_seq_".concat(eventId);
};
function isLegacyParticipant(participant) {
    return typeof participant.bibNumber === "number";
}
function getParticipantKey(participant, sourceType) {
    if (sourceType === "legacy_csv" && isLegacyParticipant(participant))
        return participant.id;
    return participant.ticketId;
}
function normalize(s) {
    return s.trim().toLowerCase();
}
function matchesSearch(participant, q) {
    var _a, _b, _c, _d;
    var nq = normalize(q);
    if (!nq)
        return true;
    var inStr = function (val) {
        return val != null && normalize(String(val)).includes(nq);
    };
    if (isLegacyParticipant(participant)) {
        return (inStr(participant.name) ||
            inStr(participant.cpf) ||
            inStr(participant.birthDate) ||
            inStr(String(participant.bibNumber)) ||
            inStr((_a = participant.modality) !== null && _a !== void 0 ? _a : null) ||
            inStr((_b = participant.team) !== null && _b !== void 0 ? _b : null));
    }
    return (inStr(participant.name) ||
        inStr(participant.cpf) ||
        inStr((_c = participant.birthDate) !== null && _c !== void 0 ? _c : null) ||
        inStr((_d = participant.sourceTicketId) !== null && _d !== void 0 ? _d : null) ||
        inStr(participant.ticketId) ||
        inStr(participant.qrCode));
}
var PENDING_QUEUE_KEY = ["takeout-pending-queue"];
var EmptyList = (0, react_1.memo)(function EmptyList() {
    return (<react_native_2.Text style={{ color: "#6b7280", textAlign: "center", paddingVertical: 32 }}>
      Nenhum participante.
    </react_native_2.Text>);
});
function EventScreen() {
    var _this = this;
    var _a, _b, _c, _d;
    var eventId = (0, expo_router_1.useLocalSearchParams)().eventId;
    var navigation = (0, native_1.useNavigation)();
    var router = (0, expo_router_1.useRouter)();
    var queryClient = (0, react_query_1.useQueryClient)();
    var _e = (0, takeout_connection_context_1.useTakeoutConnection)(), api = _e.api, isReachable = _e.isReachable, checkReachability = _e.checkReachability, baseUrl = _e.baseUrl, deviceId = _e.deviceId;
    var lockMap = (0, takeout_realtime_1.useTakeoutRealtime)(eventId !== null && eventId !== void 0 ? eventId : undefined, baseUrl, deviceId).lockMap;
    (0, react_1.useEffect)(function () {
        if (!api || !eventId || !isReachable)
            return;
        var cancelled = false;
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var raw, sinceSeq, _a, events, latestSeq, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, async_storage_1.default.getItem(SYNC_LAST_SEQ_KEY(eventId))];
                    case 1:
                        raw = _c.sent();
                        sinceSeq = raw != null ? Number(raw) : 0;
                        return [4 /*yield*/, api.getSyncEvents(eventId, sinceSeq)];
                    case 2:
                        _a = _c.sent(), events = _a.events, latestSeq = _a.latestSeq;
                        if (cancelled)
                            return [2 /*return*/];
                        if (events.length > 0) {
                            queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
                            queryClient.invalidateQueries({
                                queryKey: ["takeout-event-participants", eventId],
                            });
                        }
                        return [4 /*yield*/, async_storage_1.default.setItem(SYNC_LAST_SEQ_KEY(eventId), String(latestSeq))];
                    case 3:
                        _c.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        _b = _c.sent();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); })();
        return function () {
            cancelled = true;
        };
    }, [api, eventId, isReachable, queryClient]);
    var _f = (0, react_1.useState)(null), selectedParticipant = _f[0], setSelectedParticipant = _f[1];
    var _g = (0, react_1.useState)(""), searchQuery = _g[0], setSearchQuery = _g[1];
    var _h = (0, react_1.useState)(false), showQrScanner = _h[0], setShowQrScanner = _h[1];
    var _j = (0, react_1.useState)(false), showCreateModal = _j[0], setShowCreateModal = _j[1];
    var _k = (0, react_1.useState)(false), resetLoading = _k[0], setResetLoading = _k[1];
    var _l = (0, react_1.useState)(false), offlineNoticeVisible = _l[0], setOfflineNoticeVisible = _l[1];
    var _m = (0, react_1.useState)(new Set()), conflictTicketIds = _m[0], setConflictTicketIds = _m[1];
    var _o = (0, expo_camera_1.useCameraPermissions)(), permission = _o[0], requestPermission = _o[1];
    var eventQuery = (0, react_query_1.useQuery)({
        queryKey: ["takeout-events"],
        queryFn: function () {
            return api ? api.getEvents() : Promise.reject(new Error("No API"));
        },
        enabled: !!api && isReachable,
    });
    var event = (0, react_1.useMemo)(function () { var _a, _b; return (_b = (_a = eventQuery.data) === null || _a === void 0 ? void 0 : _a.find(function (e) { return e.eventId === eventId; })) !== null && _b !== void 0 ? _b : null; }, [eventQuery.data, eventId]);
    var sourceType = (event === null || event === void 0 ? void 0 : event.sourceType) === "legacy_csv" ? "legacy_csv" : "json_sync";
    var participantsQuery = (0, react_query_1.useQuery)({
        queryKey: ["takeout-event-participants", eventId],
        queryFn: function () {
            return api && eventId
                ? sourceType === "legacy_csv"
                    ? api.getLegacyEventParticipants(eventId)
                    : api.getEventParticipants(eventId)
                : Promise.reject(new Error("No API"));
        },
        enabled: !!api && !!eventId && isReachable,
    });
    var reservedNumbersQuery = (0, react_query_1.useQuery)({
        queryKey: ["takeout-legacy-reservations", eventId],
        queryFn: function () {
            return api && eventId
                ? api.getLegacyReservedNumbers(eventId)
                : Promise.reject(new Error("No API"));
        },
        enabled: !!api && !!eventId && isReachable && sourceType === "legacy_csv",
    });
    var reservedNumbers = (_a = reservedNumbersQuery.data) !== null && _a !== void 0 ? _a : [];
    var auditQuery = (0, react_query_1.useQuery)({
        queryKey: ["takeout-audit", eventId],
        queryFn: function () {
            return api && eventId ? api.getAudit({ eventId: eventId }) : Promise.reject(new Error("No API"));
        },
        enabled: !!api && !!eventId && isReachable,
    });
    var pendingQueueQuery = (0, react_query_1.useQuery)({
        queryKey: PENDING_QUEUE_KEY,
        queryFn: takeout_queue_1.getPendingQueue,
        refetchInterval: isReachable ? 5000 : false,
    });
    var pendingTicketIds = (0, react_1.useMemo)(function () { var _a; return new Set(((_a = pendingQueueQuery.data) !== null && _a !== void 0 ? _a : []).map(function (i) { return i.ticket_id; })); }, [pendingQueueQuery.data]);
    (0, react_1.useEffect)(function () {
        if (event === null || event === void 0 ? void 0 : event.name) {
            navigation.setOptions({ headerTitle: event.name });
        }
    }, [event === null || event === void 0 ? void 0 : event.name, navigation]);
    (0, react_1.useEffect)(function () {
        if (!showQrScanner)
            return;
        var sub = react_native_1.BackHandler.addEventListener("hardwareBackPress", function () {
            setShowQrScanner(false);
            return true;
        });
        return function () { return sub.remove(); };
    }, [showQrScanner]);
    var participants = (_b = participantsQuery.data) !== null && _b !== void 0 ? _b : [];
    var participantsById = (0, react_1.useMemo)(function () {
        return new Map(participants.map(function (participant) { return [participant.id, participant]; }));
    }, [participants]);
    var filteredParticipants = (0, react_1.useMemo)(function () { return participants.filter(function (p) { return matchesSearch(p, searchQuery); }); }, [participants, searchQuery]);
    var participantAlertMap = (0, react_1.useMemo)(function () {
        return sourceType === "legacy_csv"
            ? (0, legacy_participant_alerts_1.buildLegacyParticipantAlertMap)(participants)
            : {};
    }, [participants, sourceType]);
    var auditStatusByTicket = (0, react_1.useMemo)(function () {
        var _a;
        var map = new Map();
        ((_a = auditQuery.data) !== null && _a !== void 0 ? _a : []).forEach(function (a) {
            if (!map.has(a.ticket_id))
                map.set(a.ticket_id, a.status);
        });
        return map;
    }, [auditQuery.data]);
    var auditConfirmedTicketIds = (0, react_1.useMemo)(function () {
        var confirmed = new Set();
        auditStatusByTicket.forEach(function (status, ticketId) {
            if (status === "CONFIRMED" || status === "DUPLICATE") {
                confirmed.add(ticketId);
            }
        });
        return confirmed;
    }, [auditStatusByTicket]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (!((_a = auditQuery.data) === null || _a === void 0 ? void 0 : _a.length))
            return;
        if (sourceType === "legacy_csv")
            return;
        setConflictTicketIds(function (prev) {
            var next = new Set(prev);
            auditStatusByTicket.forEach(function (status, ticketId) {
                if (status === "CONFIRMED" || status === "DUPLICATE") {
                    next.delete(ticketId);
                }
            });
            return next;
        });
    }, [auditQuery.data, auditStatusByTicket, sourceType]);
    var total = participants.length;
    var confirmed = participants.filter(function (p) {
        return sourceType === "legacy_csv"
            ? p.checkinDone
            : auditConfirmedTicketIds.has(p.ticketId);
    }).length;
    var pending = total - confirmed;
    var onQrScanned = (0, react_1.useCallback)(function (_a) {
        var data = _a.data;
        var code = data.trim();
        var participant = participants.find(function (p) {
            if (isLegacyParticipant(p)) {
                return String(p.bibNumber) === code || p.cpf === code;
            }
            return (p.ticketId === code ||
                p.qrCode === code ||
                p.ticketId.trim() === code ||
                p.qrCode.trim() === code);
        });
        setShowQrScanner(false);
        if (!participant) {
            react_native_1.Alert.alert("Ingresso não encontrado", "Ingresso não encontrado neste evento.");
            return;
        }
        var participantKey = getParticipantKey(participant, sourceType);
        if (sourceType === "legacy_csv" ? participant.checkinDone : auditConfirmedTicketIds.has(participantKey)) {
            react_native_1.Alert.alert("Check-in já realizado", "Este ingresso já teve check-in realizado.");
            return;
        }
        if (deviceId != null &&
            lockMap[participant.id] != null &&
            lockMap[participant.id] !== deviceId) {
            react_native_1.Alert.alert("Em atendimento", "Este participante está sendo atendido por outro dispositivo. Aguarde para fazer o check-in.");
            return;
        }
        setSelectedParticipant(participant);
    }, [participants, auditConfirmedTicketIds, lockMap, deviceId, sourceType]);
    var offlineNoticeTimeoutRef = (0, react_1.useRef)(null);
    var handleQueuedOffline = (0, react_1.useCallback)(function () {
        setOfflineNoticeVisible(true);
        queryClient.invalidateQueries({ queryKey: PENDING_QUEUE_KEY });
        if (offlineNoticeTimeoutRef.current)
            clearTimeout(offlineNoticeTimeoutRef.current);
        offlineNoticeTimeoutRef.current = setTimeout(function () {
            setOfflineNoticeVisible(false);
            offlineNoticeTimeoutRef.current = null;
        }, 3500);
    }, [queryClient]);
    (0, react_1.useEffect)(function () {
        return function () {
            if (offlineNoticeTimeoutRef.current)
                clearTimeout(offlineNoticeTimeoutRef.current);
        };
    }, []);
    var handleResetCheckins = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!api || !eventId)
                        return [2 /*return*/];
                    if (sourceType === "legacy_csv") {
                        react_native_1.Alert.alert("Indisponível", "Reset de check-ins não está disponível para evento legado.");
                        return [2 /*return*/];
                    }
                    setResetLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, api.postResetEventCheckins(eventId)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, Promise.all([auditQuery.refetch(), participantsQuery.refetch()])];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    e_1 = _a.sent();
                    react_native_1.Alert.alert("Erro", e_1 instanceof Error ? e_1.message : "Falha ao desfazer check-ins.");
                    return [3 /*break*/, 6];
                case 5:
                    setResetLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [api, eventId, auditQuery, participantsQuery, sourceType]);
    var handleCreateReservation = (0, react_1.useCallback)(function () {
        if (!isReachable) {
            react_native_1.Alert.alert("Offline", "Conecte-se ao desktop para cadastrar participante.");
            return;
        }
        if (reservedNumbers.length === 0) {
            react_native_1.Alert.alert("Sem reservas", "Não há números reservados disponíveis.");
            return;
        }
        setShowCreateModal(true);
    }, [isReachable, reservedNumbers.length]);
    var createParticipantMutation = (0, react_query_1.useMutation)({
        mutationFn: function (payload) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!api || !eventId)
                    throw new Error("Sem conexão com a API.");
                return [2 /*return*/, api.postLegacyCreateParticipant(eventId, payload)];
            });
        }); },
        onSuccess: function () {
            setShowCreateModal(false);
            participantsQuery.refetch();
            reservedNumbersQuery.refetch();
        },
        onError: function (err) {
            var message = err instanceof Error ? err.message : "Falha ao cadastrar participante.";
            react_native_1.Alert.alert("Erro", message);
        },
    });
    var handlePrimaryAction = (0, react_1.useCallback)(function (participantId) {
        var participant = participantsById.get(participantId);
        if (!participant)
            return;
        setSelectedParticipant(participant);
    }, [participantsById]);
    var handleDismissConflict = (0, react_1.useCallback)(function (ticketId) {
        setConflictTicketIds(function (prev) {
            var next = new Set(prev);
            next.delete(ticketId);
            return next;
        });
    }, []);
    var handleConfirmed = (0, react_1.useCallback)(function () {
        setSelectedParticipant(null);
        participantsQuery.refetch();
        auditQuery.refetch();
    }, [participantsQuery, auditQuery]);
    var handleConflict = (0, react_1.useCallback)(function (ticketId) {
        setConflictTicketIds(function (prev) { return new Set(prev).add(ticketId); });
        auditQuery.refetch();
    }, [auditQuery]);
    var renderItem = (0, react_1.useCallback)(function (_a) {
        var _b, _c, _d;
        var item = _a.item;
        var participantKey = getParticipantKey(item, sourceType);
        var isConfirmed = sourceType === "legacy_csv"
            ? item.checkinDone
            : auditConfirmedTicketIds.has(participantKey);
        var isPendingSync = sourceType === "legacy_csv" ? false : pendingTicketIds.has(participantKey);
        var isConflict = conflictTicketIds.has(participantKey);
        var lockedByOther = deviceId != null &&
            lockMap[item.id] != null &&
            lockMap[item.id] !== deviceId;
        var alerts = (_b = participantAlertMap[item.id]) !== null && _b !== void 0 ? _b : [];
        return (<participant_list_item_1.ParticipantListItem id={item.id} ticketId={participantKey} name={item.name} ticketLabel={sourceType === "legacy_csv" && isLegacyParticipant(item)
                ? "".concat((_c = item.modality) !== null && _c !== void 0 ? _c : "Legado", " #").concat(item.bibNumber)
                : ((_d = item.sourceTicketId) !== null && _d !== void 0 ? _d : item.ticketId)} isConfirmed={isConfirmed} isPendingSync={isPendingSync} isConflict={isConflict} lockedByOther={lockedByOther} alerts={alerts} onPrimaryAction={handlePrimaryAction} onDismissConflict={handleDismissConflict}/>);
    }, [
        auditConfirmedTicketIds,
        pendingTicketIds,
        conflictTicketIds,
        lockMap,
        participantAlertMap,
        deviceId,
        handlePrimaryAction,
        handleDismissConflict,
        sourceType,
    ]);
    if (!eventId) {
        return (<ui_tamagui_1.ScreenContainer mode="static">
        <react_native_2.View style={{ padding: 16 }}>
          <react_native_2.Text style={{ color: "#6b7280" }}>Evento não encontrado.</react_native_2.Text>
        </react_native_2.View>
      </ui_tamagui_1.ScreenContainer>);
    }
    if (showQrScanner) {
        if (!permission) {
            return (<ui_tamagui_1.ScreenContainer mode="static">
          <react_native_2.View style={{ padding: 16, paddingTop: 24 }}>
            <react_native_2.Text style={{ color: "#6b7280" }}>Verificando permissão da câmera...</react_native_2.Text>
          </react_native_2.View>
        </ui_tamagui_1.ScreenContainer>);
        }
        if (!permission.granted) {
            return (<ui_tamagui_1.ScreenContainer mode="static">
          <react_native_2.View style={{ padding: 16, paddingTop: 24 }}>
            <react_native_2.Text style={{ color: "#111827", fontWeight: "500", marginBottom: 8 }}>Acesso à câmera</react_native_2.Text>
            <react_native_2.Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
              Necessário para escanear o QR do ingresso.
            </react_native_2.Text>
            <ui_tamagui_1.Button onPress={requestPermission}>Permitir câmera</ui_tamagui_1.Button>
            <react_native_2.View style={{ marginTop: 12 }}>
              <ui_tamagui_1.Button variant="bordered" onPress={function () { return setShowQrScanner(false); }}>
                Voltar
              </ui_tamagui_1.Button>
            </react_native_2.View>
          </react_native_2.View>
        </ui_tamagui_1.ScreenContainer>);
        }
        return (<react_native_2.View style={{ flex: 1, backgroundColor: "black" }}>
        <expo_camera_1.CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onQrScanned}/>
        <event_1.QrTicketScannerOverlay onBack={function () { return setShowQrScanner(false); }}/>
        <react_native_2.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32 }}>
          <ui_tamagui_1.Button variant="bordered" onPress={function () { return setShowQrScanner(false); }}>
            Cancelar
          </ui_tamagui_1.Button>
        </react_native_2.View>
      </react_native_2.View>);
    }
    return (<>
      <ui_tamagui_1.ScreenContainer mode="static">
        {event ? (<event_1.EventHeader title={(_c = event.name) !== null && _c !== void 0 ? _c : eventId} subtitle={event.startDate ? (0, format_date_1.formatDateShort)(event.startDate) : undefined} isLive={isReachable}/>) : null}

        {!isReachable ? (<ui_tamagui_1.Banner variant="warn" style={{ marginHorizontal: 16, marginTop: 12 }}>
            <react_native_2.Text style={{ color: "#111827", fontSize: 14, marginBottom: 12 }}>
              Desktop desconectado. Conecte-se para sincronizar dados.
            </react_native_2.Text>
            <react_native_2.View style={{ flexDirection: "row", gap: 8 }}>
              <ui_tamagui_1.Button onPress={function () { return checkReachability(); }}>Tentar novamente</ui_tamagui_1.Button>
              <ui_tamagui_1.Button variant="bordered" onPress={function () { return router.push("/pair"); }}>
                Reconectar
              </ui_tamagui_1.Button>
            </react_native_2.View>
          </ui_tamagui_1.Banner>) : null}

        <react_native_2.View style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#ffffff",
        }}>
          <event_1.SearchBar value={searchQuery} onChange={setSearchQuery}/>
          <event_1.QuickActionsRow onScan={function () { return setShowQrScanner(true); }} onReset={handleResetCheckins} resetLoading={resetLoading} undoCount={confirmed} onCreateReservation={sourceType === "legacy_csv" ? handleCreateReservation : undefined} createDisabled={!isReachable || reservedNumbers.length === 0}/>
        </react_native_2.View>

        <event_1.OfflineQueueNotice visible={offlineNoticeVisible}/>

        <event_1.SummaryStats total={total} confirmed={confirmed} pending={pending} pendingSync={sourceType === "legacy_csv" ? 0 : pendingTicketIds.size}/>

        {participantsQuery.isLoading ? (<react_native_2.View style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
                backgroundColor: "#ffffff",
            }}>
            <ui_tamagui_1.Spinner size="large"/>
          </react_native_2.View>) : (<react_native_2.FlatList data={filteredParticipants} keyExtractor={function (participant) { return participant.id; }} renderItem={renderItem} contentContainerStyle={{ paddingVertical: 8 }} ListEmptyComponent={EmptyList} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={7} updateCellsBatchingPeriod={50} removeClippedSubviews keyboardShouldPersistTaps="handled"/>)}
      </ui_tamagui_1.ScreenContainer>

      <confirm_takeout_modal_1.ConfirmTakeoutModal visible={!!selectedParticipant} participant={selectedParticipant} alerts={selectedParticipant ? (_d = participantAlertMap[selectedParticipant.id]) !== null && _d !== void 0 ? _d : [] : []} sourceType={sourceType} eventId={eventId} onClose={function () { return setSelectedParticipant(null); }} onConfirmed={handleConfirmed} onQueuedOffline={handleQueuedOffline} onConflict={handleConflict}/>

      <legacy_create_participant_modal_1.LegacyCreateParticipantModal visible={showCreateModal} reservations={reservedNumbers} submitting={createParticipantMutation.isPending} onClose={function () { return setShowCreateModal(false); }} onSubmit={function (payload) { return createParticipantMutation.mutate(payload); }}/>
    </>);
}
