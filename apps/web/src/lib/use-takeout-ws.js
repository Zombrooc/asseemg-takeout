"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeoutWsConfig = void 0;
exports.nextReconnectDelay = nextReconnectDelay;
exports.useTakeoutWs = useTakeoutWs;
var react_query_1 = require("@tanstack/react-query");
var react_1 = require("react");
var takeout_api_1 = require("./takeout-api");
var INITIAL_RECONNECT_DELAY_MS = 2000;
var MAX_RECONNECT_DELAY_MS = 15000;
var HEARTBEAT_TIMEOUT_MS = 90000;
function wsUrl(baseUrl, eventId, deviceId) {
    var base = baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
    var params = new URLSearchParams({ event_id: eventId, device_id: deviceId });
    return "".concat(base, "/ws?").concat(params.toString());
}
function nextReconnectDelay(current) {
    return Math.min(Math.round(current * 1.7), MAX_RECONNECT_DELAY_MS);
}
/**
 * Subscribes to takeout WebSocket for the given event and invalidates
 * participants query on participant_checked_in so the table updates in real time.
 * Reconnects with backoff and enforces heartbeat timeout for stale connections.
 */
function useTakeoutWs(eventId) {
    var queryClient = (0, react_query_1.useQueryClient)();
    var reconnectDelayRef = (0, react_1.useRef)(INITIAL_RECONNECT_DELAY_MS);
    var reconnectTimerRef = (0, react_1.useRef)(null);
    var heartbeatTimerRef = (0, react_1.useRef)(null);
    var eventIdRef = (0, react_1.useRef)(eventId);
    eventIdRef.current = eventId;
    (0, react_1.useEffect)(function () {
        if (!eventId)
            return;
        var baseUrl = (0, takeout_api_1.getTakeoutBaseUrl)();
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
            ws = new WebSocket(wsUrl(baseUrl, eventId, "web-dashboard"));
            resetHeartbeatTimer();
            ws.onopen = function () {
                reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
                resetHeartbeatTimer();
            };
            ws.onmessage = function (event) {
                resetHeartbeatTimer();
                try {
                    var data = JSON.parse(event.data);
                    if (data.type === "heartbeat")
                        return;
                    if (data.type === "participant_checked_in" ||
                        data.type === "participant_checkin_reverted" ||
                        data.type === "participant_updated") {
                        var id = eventIdRef.current;
                        if (id) {
                            queryClient.invalidateQueries({ queryKey: ["takeout", "events", id, "participants"] });
                        }
                    }
                }
                catch (_a) {
                    // ignore parse errors
                }
            };
            ws.onerror = function () { };
            ws.onclose = function () {
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
    }, [eventId, queryClient]);
}
exports.takeoutWsConfig = {
    INITIAL_RECONNECT_DELAY_MS: INITIAL_RECONNECT_DELAY_MS,
    MAX_RECONNECT_DELAY_MS: MAX_RECONNECT_DELAY_MS,
    HEARTBEAT_TIMEOUT_MS: HEARTBEAT_TIMEOUT_MS,
};
