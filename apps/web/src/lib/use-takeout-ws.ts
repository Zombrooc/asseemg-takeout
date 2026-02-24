import type { WsTakeoutMessage } from "@pickup/api/takeout-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getTakeoutBaseUrl } from "./takeout-api";

const INITIAL_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 90_000;

function wsUrl(baseUrl: string, eventId: string, deviceId: string): string {
  const base = baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  const params = new URLSearchParams({ event_id: eventId, device_id: deviceId });
  return `${base}/ws?${params.toString()}`;
}

export function nextReconnectDelay(current: number): number {
  return Math.min(Math.round(current * 1.7), MAX_RECONNECT_DELAY_MS);
}

/**
 * Subscribes to takeout WebSocket for the given event and invalidates
 * participants query on participant_checked_in so the table updates in real time.
 * Reconnects with backoff and enforces heartbeat timeout for stale connections.
 */
export function useTakeoutWs(eventId: string | undefined): void {
  const queryClient = useQueryClient();
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;

  useEffect(() => {
    if (!eventId) return;
    const baseUrl = getTakeoutBaseUrl();

    let isActive = true;
    let ws: WebSocket | null = null;

    const clearTimers = () => {
      if (reconnectTimerRef.current != null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (heartbeatTimerRef.current != null) {
        clearTimeout(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };

    const resetHeartbeatTimer = () => {
      if (heartbeatTimerRef.current != null) {
        clearTimeout(heartbeatTimerRef.current);
      }
      heartbeatTimerRef.current = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }, HEARTBEAT_TIMEOUT_MS);
    };

    const scheduleReconnect = () => {
      if (!isActive || reconnectTimerRef.current != null) return;
      const delay = reconnectDelayRef.current;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (isActive) connect();
      }, delay);
      reconnectDelayRef.current = nextReconnectDelay(reconnectDelayRef.current);
    };

    const connect = () => {
      ws = new WebSocket(wsUrl(baseUrl, eventId, "web-dashboard"));
      resetHeartbeatTimer();

      ws.onopen = () => {
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        resetHeartbeatTimer();
      };

      ws.onmessage = (event) => {
        resetHeartbeatTimer();
        try {
          const data = JSON.parse(event.data as string) as WsTakeoutMessage;
          if (data.type === "heartbeat") return;
          if (data.type === "participant_checked_in") {
            const id = eventIdRef.current;
            if (id) {
              queryClient.invalidateQueries({ queryKey: ["takeout", "events", id, "participants"] });
            }
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        if (!isActive) return;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      isActive = false;
      clearTimers();
      if (ws != null) ws.close();
    };
  }, [eventId, queryClient]);
}

export const takeoutWsConfig = {
  INITIAL_RECONNECT_DELAY_MS,
  MAX_RECONNECT_DELAY_MS,
  HEARTBEAT_TIMEOUT_MS,
} as const;
