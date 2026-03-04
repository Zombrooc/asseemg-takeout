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

/** participantId -> deviceId being handled */
export type LockMap = Record<string, string>;

export function nextReconnectDelay(current: number): number {
  return Math.min(Math.round(current * 1.7), MAX_RECONNECT_DELAY_MS);
}

export type RealtimeInvalidation = {
  invalidateParticipants: boolean;
  invalidateAudit: boolean;
  invalidateEvents: boolean;
};

export function getRealtimeInvalidation(message: WsTakeoutMessage): RealtimeInvalidation {
  if (message.type === "participant_checked_in") {
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

export function parseRealtimeMessageData(raw: unknown): WsTakeoutMessage | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as WsTakeoutMessage;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    const maybe = raw as { type?: unknown };
    if (typeof maybe.type === "string") return raw as WsTakeoutMessage;
  }
  return null;
}

function getMessageSeq(message: WsTakeoutMessage): number | null {
  const raw = (message as { seq?: unknown }).seq;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
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
  const lastSeqRef = useRef<number | null>(null);

  const setLockMapRef = useRef(setLockMap);
  setLockMapRef.current = setLockMap;

  const updateLockMap = useCallback((updater: (prev: LockMap) => LockMap) => {
    setLockMapRef.current(updater);
  }, []);

  useEffect(() => {
    if (!eventId || !baseUrl || !deviceId) return;
    lastSeqRef.current = null;

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
      const lastSeq = lastSeqRef.current != null ? String(lastSeqRef.current) : undefined;
      ws = new WebSocket(wsUrl(baseUrl, eventId, deviceId, lastSeq));
      if (__DEV__) {
        console.log("[ws.mobile] connect", { eventId, baseUrl, lastSeq });
      }
      resetHeartbeatTimer();

      ws.onopen = () => {
        if (__DEV__) {
          console.log("[ws.mobile] open", { eventId, baseUrl });
        }
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        resetHeartbeatTimer();
      };

      ws.onmessage = (event) => {
        resetHeartbeatTimer();
        const data = parseRealtimeMessageData(event.data);
        if (data == null) return;
        if (data.type === "heartbeat") return;
        const seq = getMessageSeq(data);
        if (seq != null && (lastSeqRef.current == null || seq > lastSeqRef.current)) {
          lastSeqRef.current = seq;
        }

        if (__DEV__) {
          console.log("[ws.mobile] message", {
            eventId,
            type: data.type,
            seq,
          });
        }

        const invalidation = getRealtimeInvalidation(data);
        if (invalidation.invalidateAudit) {
          queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
        }
        if (invalidation.invalidateParticipants) {
          queryClient.invalidateQueries({ queryKey: ["takeout-event-participants", eventId] });
          void queryClient.refetchQueries({
            queryKey: ["takeout-event-participants", eventId],
            type: "active",
          });
          if (__DEV__) {
            console.log("[ws.mobile] invalidated participants", { eventId, type: data.type });
          }
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
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        if (__DEV__) {
          console.log("[ws.mobile] close", { eventId, baseUrl });
        }
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

/** WS channel for desktop event list changes (archive/delete/unarchive). */
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
  const lastSeqRef = useRef<number | null>(null);

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
      const lastSeq = lastSeqRef.current != null ? String(lastSeqRef.current) : undefined;
      ws = new WebSocket(wsUrl(baseUrl, EVENTS_LIST_CHANNEL, deviceId, lastSeq));
      if (__DEV__) {
        console.log("[ws.mobile.events] connect", { baseUrl, lastSeq });
      }
      resetHeartbeatTimer();

      ws.onopen = () => {
        if (__DEV__) {
          console.log("[ws.mobile.events] open", { baseUrl });
        }
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        resetHeartbeatTimer();
      };

      ws.onmessage = (event) => {
        resetHeartbeatTimer();
        const data = parseRealtimeMessageData(event.data);
        if (data == null) return;
        if (data.type === "heartbeat") return;
        const seq = getMessageSeq(data);
        if (seq != null && (lastSeqRef.current == null || seq > lastSeqRef.current)) {
          lastSeqRef.current = seq;
        }
        if (__DEV__) {
          console.log("[ws.mobile.events] message", { type: data.type, seq });
        }
        const invalidation = getRealtimeInvalidation(data);
        if (invalidation.invalidateEvents) {
          queryClient.invalidateQueries({ queryKey: ["takeout-events"] });
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        if (__DEV__) {
          console.log("[ws.mobile.events] close", { baseUrl });
        }
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
