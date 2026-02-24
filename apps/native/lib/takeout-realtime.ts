import type { WsTakeoutMessage } from "@pickup/api/takeout-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_RECONNECT_DELAY_MS = 1_500;
const MAX_RECONNECT_DELAY_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 90_000;

function wsUrl(baseUrl: string, eventId: string, deviceId: string, lastSeq?: string): string {
  const base = baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  const params = new URLSearchParams({ event_id: eventId, device_id: deviceId });
  if (lastSeq != null) params.set("last_seq", lastSeq);
  return `${base}/ws?${params.toString()}`;
}

/** participantId -> deviceId que está atendendo */
export type LockMap = Record<string, string>;

export function nextReconnectDelay(current: number): number {
  return Math.min(Math.round(current * 1.7), MAX_RECONNECT_DELAY_MS);
}

export function useTakeoutRealtime(
  eventId: string | undefined,
  baseUrl: string | null,
  deviceId: string | null
): { lockMap: LockMap } {
  const queryClient = useQueryClient();
  const [lockMap, setLockMap] = useState<LockMap>({});

  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setLockMapRef = useRef(setLockMap);
  setLockMapRef.current = setLockMap;

  const updateLockMap = useCallback((updater: (prev: LockMap) => LockMap) => {
    setLockMapRef.current(updater);
  }, []);

  useEffect(() => {
    if (!eventId || !baseUrl || !deviceId) return;

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
      ws = new WebSocket(wsUrl(baseUrl, eventId, deviceId));
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
            queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
            queryClient.invalidateQueries({ queryKey: ["takeout-event-participants", eventId] });
            return;
          }
          if (data.type === "lock_acquired" && data.participant_id != null && data.device_id != null) {
            updateLockMap((prev) => ({ ...prev, [data.participant_id]: data.device_id }));
            return;
          }
          if (data.type === "lock_released" && data.participant_id != null) {
            updateLockMap((prev) => {
              const next = { ...prev };
              delete next[data.participant_id];
              return next;
            });
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
  }, [eventId, baseUrl, deviceId, queryClient, updateLockMap]);

  return { lockMap };
}

/** Canal WS para notificação de mudança na lista de eventos (arquivar/apagar/desarquivar no desktop). */
export const EVENTS_LIST_CHANNEL = "_events";

/**
 * Conecta ao canal global da lista de eventos. Ao receber events_list_changed, invalida a query de eventos
 * para que todos os staffs vejam a lista atualizada (eventos arquivados/apagados somem na hora).
 */
export function useEventsListRealtime(baseUrl: string | null, deviceId: string | null): void {
  const queryClient = useQueryClient();
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!baseUrl || !deviceId) return;

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
      if (heartbeatTimerRef.current != null) clearTimeout(heartbeatTimerRef.current);
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
      ws = new WebSocket(wsUrl(baseUrl, EVENTS_LIST_CHANNEL, deviceId));
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
          if (data.type === "events_list_changed") {
            queryClient.invalidateQueries({ queryKey: ["takeout-events"] });
          }
        } catch {
          // ignore
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
  }, [baseUrl, deviceId, queryClient]);
}

export const realtimeConfig = {
  INITIAL_RECONNECT_DELAY_MS,
  MAX_RECONNECT_DELAY_MS,
  HEARTBEAT_TIMEOUT_MS,
} as const;
