"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeConfig = exports.EVENTS_LIST_CHANNEL = void 0;
exports.nextReconnectDelay = nextReconnectDelay;
exports.getRealtimeInvalidation = getRealtimeInvalidation;
exports.parseRealtimeMessageData = parseRealtimeMessageData;
exports.applyLockEvent = applyLockEvent;
exports.expireLocks = expireLocks;
exports.applyParticipantCheckinPatch = applyParticipantCheckinPatch;
exports.applyParticipantUpdatePatch = applyParticipantUpdatePatch;
exports.useTakeoutRealtime = useTakeoutRealtime;
exports.useEventsListRealtime = useEventsListRealtime;
var react_query_1 = require("@tanstack/react-query");
var format_date_1 = require("@/lib/format-date");
var react_1 = require("react");
var INITIAL_RECONNECT_DELAY_MS = 1500;
var MAX_RECONNECT_DELAY_MS = 15000;
var HEARTBEAT_TIMEOUT_MS = 90000;
function wsUrl(baseUrl, eventId, deviceId, lastSeq) {
    var base = baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
    var params = new URLSearchParams({ event_id: eventId, device_id: deviceId });
    if (lastSeq != null)
        params.set("last_seq", lastSeq);
    return "".concat(base, "/ws?").concat(params.toString());
}
function nextReconnectDelay(current) {
    return Math.min(Math.round(current * 1.7), MAX_RECONNECT_DELAY_MS);
}
function getRealtimeInvalidation(message) {
    if (message.type === "participant_checked_in") {
        return {
            invalidateParticipants: true,
            invalidateAudit: true,
            invalidateEvents: false,
        };
    }
    if (message.type === "participant_checkin_reverted") {
        return {
            invalidateParticipants: true,
            invalidateAudit: true,
            invalidateEvents: false,
        };
    }
    if (message.type === "participant_updated") {
        return {
            invalidateParticipants: true,
            invalidateAudit: false,
            invalidateEvents: false,
        };
    }
    if (message.type === "events_list_changed") {
        return {
            invalidateParticipants: false,
            invalidateAudit: false,
            invalidateEvents: true,
        };
    }
    return {
        invalidateParticipants: false,
        invalidateAudit: false,
        invalidateEvents: false,
    };
}
function parseRealtimeMessageData(raw) {
    if (raw == null)
        return null;
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        }
        catch (_a) {
            return null;
        }
    }
    if (typeof raw === "object") {
        var maybe = raw;
        if (typeof maybe.type === "string")
            return raw;
    }
    return null;
}
function getMessageSeq(message) {
    var raw = message.seq;
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return Math.trunc(raw);
    }
    if (typeof raw === "string") {
        var parsed = Number(raw);
        if (Number.isFinite(parsed))
            return Math.trunc(parsed);
    }
    return null;
}
function applyLockEvent(locks, message, now) {
    if (now === void 0) { now = Math.floor(Date.now() / 1000); }
    if (!["lock_acquired", "lock_renewed", "lock_snapshot", "lock_released"].includes(message.type))
        return locks;
    var participantId = message.participant_id;
    if (!participantId)
        return locks;
    var current = locks[participantId];
    var seq = getMessageSeq(message) || 0;
    if (current && seq > 0 && current.seq > seq)
        return locks;
    if (message.type === "lock_released") {
        if (current && current.deviceId === message.device_id) {
            var next = __assign({}, locks);
            delete next[participantId];
            return next;
        }
        return locks;
    }
    var expiresAt = Number(message.expires_at);
    if (!message.device_id || !Number.isFinite(expiresAt) || expiresAt <= now)
        return locks;
    var next = __assign({}, locks);
    next[participantId] = { deviceId: message.device_id, expiresAt: expiresAt, seq: seq };
    return next;
}
function expireLocks(locks, now) {
    if (now === void 0) { now = Math.floor(Date.now() / 1000); }
    var next = Object.fromEntries(Object.entries(locks).filter(function (_a) { var lock = _a[1]; return lock.expiresAt > now; }));
    return Object.keys(next).length === Object.keys(locks).length ? locks : next;
}
function applyParticipantCheckinPatch(participants, message, checkinDone) {
    var isLegacy = message.source_type === "legacy_csv" || (message.ticket_id == null && message.participant_id != null);
    var target = isLegacy ? message.participant_id : message.ticket_id;
    if (!target)
        return participants;
    return participants.map(function (participant) { return (isLegacy ? participant.id === target : participant.ticketId === target)
        ? __assign(__assign({}, participant), { checkinDone: checkinDone }) : participant; });
}
function applyParticipantUpdatePatch(participants, message) {
    if (message.type !== "participant_updated")
        return participants;
    var isLegacy = message.source_type === "legacy_csv" || message.ticket_id == null;
    var target = isLegacy ? message.participant_id : message.ticket_id;
    if (!target)
        return participants;
    var patch = message.participant ? __assign({}, message.participant) : {};
    if (message.name !== undefined)
        patch.name = message.name;
    if (message.cpf !== undefined)
        patch.cpf = message.cpf;
    if (message.birthDate !== undefined)
        patch.birthDate = message.birthDate;
    if (message.shirtSize !== undefined)
        patch.shirtSize = message.shirtSize;
    if (message.team !== undefined)
        patch.team = message.team;
    if (isLegacy && message.modality !== undefined)
        patch.modality = message.modality;
    if (!isLegacy && message.ticketName !== undefined)
        patch.ticketName = message.ticketName;
    if (patch.birthDate !== undefined)
        patch.birthDate = typeof patch.birthDate === "string" ? (0, format_date_1.normalizeDateOnly)(patch.birthDate) : null;
    return participants.map(function (participant) {
        var matches = isLegacy ? participant.id === target : participant.ticketId === target;
        return matches ? __assign(__assign({}, participant), patch) : participant;
    });
}
function useTakeoutRealtime(eventId, baseUrl, deviceId) {
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, react_1.useState)({}), lockMap = _a[0], setLockMap = _a[1];
    var reconnectDelayRef = (0, react_1.useRef)(INITIAL_RECONNECT_DELAY_MS);
    var reconnectTimerRef = (0, react_1.useRef)(null);
    var heartbeatTimerRef = (0, react_1.useRef)(null);
    var lockExpiryTimerRef = (0, react_1.useRef)(null);
    var lastSeqRef = (0, react_1.useRef)(null);
    var lockEntriesRef = (0, react_1.useRef)({});
    var setLockMapRef = (0, react_1.useRef)(setLockMap);
    setLockMapRef.current = setLockMap;
    var updateLockMap = (0, react_1.useCallback)(function (updater) {
        setLockMapRef.current(updater);
    }, []);
    (0, react_1.useEffect)(function () {
        if (!eventId || !baseUrl || !deviceId)
            return;
        lastSeqRef.current = null;
        lockEntriesRef.current = {};
        setLockMap({});
        var isActive = true;
        var ws = null;
        var clearTimers = function () {
            if (reconnectTimerRef.current != null) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            if (heartbeatTimerRef.current != null) {
                clearTimeout(heartbeatTimerRef.current);
                heartbeatTimerRef.current = null;
            }
            if (lockExpiryTimerRef.current != null) {
                clearInterval(lockExpiryTimerRef.current);
                lockExpiryTimerRef.current = null;
            }
        };
        var resetHeartbeatTimer = function () {
            if (heartbeatTimerRef.current != null) {
                clearTimeout(heartbeatTimerRef.current);
            }
            heartbeatTimerRef.current = setTimeout(function () {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, HEARTBEAT_TIMEOUT_MS);
        };
        var scheduleReconnect = function () {
            if (!isActive || reconnectTimerRef.current != null)
                return;
            var delay = reconnectDelayRef.current;
            reconnectTimerRef.current = setTimeout(function () {
                reconnectTimerRef.current = null;
                if (isActive)
                    connect();
            }, delay);
            reconnectDelayRef.current = nextReconnectDelay(reconnectDelayRef.current);
        };
        var connect = function () {
            var lastSeq = lastSeqRef.current != null ? String(lastSeqRef.current) : undefined;
            ws = new WebSocket(wsUrl(baseUrl, eventId, deviceId, lastSeq));
            if (__DEV__) {
                console.log("[ws.mobile] connect", { eventId: eventId, baseUrl: baseUrl, lastSeq: lastSeq });
            }
            resetHeartbeatTimer();
            ws.onopen = function () {
                if (__DEV__) {
                    console.log("[ws.mobile] open", { eventId: eventId, baseUrl: baseUrl });
                }
                reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
                resetHeartbeatTimer();
            };
            ws.onmessage = function (event) {
                resetHeartbeatTimer();
                var data = parseRealtimeMessageData(event.data);
                if (data == null)
                    return;
                if (data.type === "heartbeat")
                    return;
                var seq = getMessageSeq(data);
                if (seq != null && data.type !== "lock_snapshot" && lastSeqRef.current != null && seq <= lastSeqRef.current)
                    return;
                if (seq != null && (lastSeqRef.current == null || seq > lastSeqRef.current)) {
                    lastSeqRef.current = seq;
                }
                if (__DEV__) {
                    console.log("[ws.mobile] message", {
                        eventId: eventId,
                        type: data.type,
                        seq: seq,
                    });
                }
                if (["lock_acquired", "lock_renewed", "lock_snapshot", "lock_released"].includes(data.type)) {
                    lockEntriesRef.current = expireLocks(applyLockEvent(lockEntriesRef.current, data));
                    setLockMap(Object.fromEntries(Object.entries(lockEntriesRef.current).map(function (_a) { var id = _a[0], lock = _a[1]; return [id, lock.deviceId]; })));
                    return;
                }
                var invalidation = getRealtimeInvalidation(data);
                if (invalidation.invalidateAudit) {
                    queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
                }
                if (invalidation.invalidateParticipants) {
                    if (data.type === "participant_checked_in" || data.type === "participant_checkin_reverted")
                        queryClient.setQueryData(["takeout-event-participants", eventId], function (participants) { return Array.isArray(participants) ? applyParticipantCheckinPatch(participants, data, data.type === "participant_checked_in") : participants; });
                    else if (data.type === "participant_updated") {
                        queryClient.setQueryData(["takeout-event-participants", eventId], function (participants) { return Array.isArray(participants) ? applyParticipantUpdatePatch(participants, data) : participants; });
                    }
                    else
                        queryClient.invalidateQueries({ queryKey: ["takeout-event-participants", eventId] });
                    if (__DEV__) {
                        console.log("[ws.mobile] invalidated participants", { eventId: eventId, type: data.type });
                    }
                    return;
                }
            };
            ws.onerror = function () { };
            ws.onclose = function () {
                if (__DEV__) {
                    console.log("[ws.mobile] close", { eventId: eventId, baseUrl: baseUrl });
                }
                if (!isActive)
                    return;
                scheduleReconnect();
            };
        };
        connect();
        lockExpiryTimerRef.current = setInterval(function () {
            lockEntriesRef.current = expireLocks(lockEntriesRef.current);
            setLockMap(Object.fromEntries(Object.entries(lockEntriesRef.current).map(function (_a) { var id = _a[0], lock = _a[1]; return [id, lock.deviceId]; })));
        }, 1000);
        return function () {
            isActive = false;
            clearTimers();
            if (ws != null)
                ws.close();
        };
    }, [eventId, baseUrl, deviceId, queryClient, updateLockMap]);
    return { lockMap: lockMap };
}
/** WS channel for desktop event list changes (archive/delete/unarchive). */
exports.EVENTS_LIST_CHANNEL = "_events";
/**
 * Conecta ao canal global da lista de eventos. Ao receber events_list_changed, invalida a query de eventos
 * para que todos os staffs vejam a lista atualizada (eventos arquivados/apagados somem na hora).
 */
function useEventsListRealtime(baseUrl, deviceId) {
    var queryClient = (0, react_query_1.useQueryClient)();
    var reconnectDelayRef = (0, react_1.useRef)(INITIAL_RECONNECT_DELAY_MS);
    var reconnectTimerRef = (0, react_1.useRef)(null);
    var heartbeatTimerRef = (0, react_1.useRef)(null);
    var lastSeqRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!baseUrl || !deviceId)
            return;
        var isActive = true;
        var ws = null;
        var clearTimers = function () {
            if (reconnectTimerRef.current != null) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            if (heartbeatTimerRef.current != null) {
                clearTimeout(heartbeatTimerRef.current);
                heartbeatTimerRef.current = null;
            }
        };
        var resetHeartbeatTimer = function () {
            if (heartbeatTimerRef.current != null)
                clearTimeout(heartbeatTimerRef.current);
            heartbeatTimerRef.current = setTimeout(function () {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, HEARTBEAT_TIMEOUT_MS);
        };
        var scheduleReconnect = function () {
            if (!isActive || reconnectTimerRef.current != null)
                return;
            var delay = reconnectDelayRef.current;
            reconnectTimerRef.current = setTimeout(function () {
                reconnectTimerRef.current = null;
                if (isActive)
                    connect();
            }, delay);
            reconnectDelayRef.current = nextReconnectDelay(reconnectDelayRef.current);
        };
        var connect = function () {
            var lastSeq = lastSeqRef.current != null ? String(lastSeqRef.current) : undefined;
            ws = new WebSocket(wsUrl(baseUrl, exports.EVENTS_LIST_CHANNEL, deviceId, lastSeq));
            if (__DEV__) {
                console.log("[ws.mobile.events] connect", { baseUrl: baseUrl, lastSeq: lastSeq });
            }
            resetHeartbeatTimer();
            ws.onopen = function () {
                if (__DEV__) {
                    console.log("[ws.mobile.events] open", { baseUrl: baseUrl });
                }
                reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
                resetHeartbeatTimer();
            };
            ws.onmessage = function (event) {
                resetHeartbeatTimer();
                var data = parseRealtimeMessageData(event.data);
                if (data == null)
                    return;
                if (data.type === "heartbeat")
                    return;
                var seq = getMessageSeq(data);
                if (seq != null && (lastSeqRef.current == null || seq > lastSeqRef.current)) {
                    lastSeqRef.current = seq;
                }
                if (__DEV__) {
                    console.log("[ws.mobile.events] message", { type: data.type, seq: seq });
                }
                var invalidation = getRealtimeInvalidation(data);
                if (invalidation.invalidateEvents) {
                    queryClient.invalidateQueries({ queryKey: ["takeout-events"] });
                }
            };
            ws.onerror = function () { };
            ws.onclose = function () {
                if (__DEV__) {
                    console.log("[ws.mobile.events] close", { baseUrl: baseUrl });
                }
                if (!isActive)
                    return;
                scheduleReconnect();
            };
        };
        connect();
        return function () {
            isActive = false;
            clearTimers();
            if (ws != null)
                ws.close();
        };
    }, [baseUrl, deviceId, queryClient]);
}
exports.realtimeConfig = {
    INITIAL_RECONNECT_DELAY_MS: INITIAL_RECONNECT_DELAY_MS,
    MAX_RECONNECT_DELAY_MS: MAX_RECONNECT_DELAY_MS,
    HEARTBEAT_TIMEOUT_MS: HEARTBEAT_TIMEOUT_MS,
};
