import type { WsTakeoutMessage } from "@pickup/api/takeout-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeDateOnly } from "@/lib/format-date";
import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_RECONNECT_DELAY_MS = 1_500;
const MAX_RECONNECT_DELAY_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 90_000;

function wsUrl(baseUrl: string): string {
  const base = baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  return `${base}/ws`;
}

/** participantId -> deviceId being handled */
export type LockMap = Record<string, string>;
export type LockEntry = { deviceId: string; expiresAt: number; seq: number };

export function applyLockEvent(
  locks: Record<string, LockEntry>,
  message: WsTakeoutMessage,
  now = Math.floor(Date.now() / 1000),
): Record<string, LockEntry> {
  if (!["lock_acquired", "lock_renewed", "lock_snapshot", "lock_released"].includes(message.type)) return locks;
  const participantId = (message as { participant_id?: string }).participant_id;
  if (!participantId) return locks;
  const current = locks[participantId];
  const seq = getMessageSeq(message) ?? 0;
  if (current && seq > 0 && current.seq > seq) return locks;
  const deviceId = (message as { device_id?: string }).device_id;
  if (message.type === "lock_released") {
    if (current && current.deviceId === deviceId) {
      const next = { ...locks };
      delete next[participantId];
      return next;
    }
    return locks;
  }
  const expiresAt = Number((message as { expires_at?: unknown }).expires_at);
  if (!deviceId || !Number.isFinite(expiresAt) || expiresAt <= now) return locks;
  return { ...locks, [participantId]: { deviceId, expiresAt, seq } };
}

export function expireLocks(
  locks: Record<string, LockEntry>,
  now = Math.floor(Date.now() / 1000),
): Record<string, LockEntry> {
  const next = Object.fromEntries(Object.entries(locks).filter(([, lock]) => lock.expiresAt > now));
  return Object.keys(next).length === Object.keys(locks).length ? locks : next;
}

export function applyParticipantCheckinPatch<T extends { id: string; ticketId?: string; checkinDone: boolean }>(
  participants: T[], message: WsTakeoutMessage, checkinDone: boolean,
): T[] {
  const participantMessage = message as { source_type?: string; participant_id?: string; ticket_id?: string };
  const isLegacy = participantMessage.source_type === "legacy_csv" || (participantMessage.ticket_id == null && participantMessage.participant_id != null);
  const target = isLegacy ? participantMessage.participant_id : participantMessage.ticket_id;
  if (!target) return participants;
  return participants.map((participant) => {
    const matches = isLegacy
      ? participant.id === target
      : participant.ticketId === target;
    return matches ? { ...participant, checkinDone } : participant;
  });
}

export function applyParticipantUpdatePatch<T extends { id: string; ticketId?: string }>(
  participants: T[],
  message: WsTakeoutMessage,
): T[] {
  if (message.type !== "participant_updated") return participants;

  const isLegacy = message.source_type === "legacy_csv" || message.ticket_id == null;
  const target = isLegacy ? message.participant_id : message.ticket_id;
  if (!target) return participants;

  const patch: Record<string, unknown> = message.participant
    ? { ...(message.participant as unknown as Record<string, unknown>) }
    : {};
  if (message.name !== undefined) patch.name = message.name;
  if (message.cpf !== undefined) patch.cpf = message.cpf;
  if (message.birthDate !== undefined) patch.birthDate = message.birthDate;
  if (message.shirtSize !== undefined) patch.shirtSize = message.shirtSize;
  if (message.team !== undefined) patch.team = message.team;
  if (isLegacy && message.modality !== undefined) patch.modality = message.modality;
  if (!isLegacy && message.ticketName !== undefined) patch.ticketName = message.ticketName;
  if (patch.birthDate !== undefined) {
    patch.birthDate = typeof patch.birthDate === "string" ? normalizeDateOnly(patch.birthDate) : null;
  }

  return participants.map((participant) => {
    const matches = isLegacy
      ? participant.id === target
      : participant.ticketId === target;
    return matches ? ({ ...participant, ...patch } as T) : participant;
  });
}

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
  deviceId: string | null,
  accessToken: string | null,
): { lockMap: LockMap } {
  const queryClient = useQueryClient();
  const [lockMap, setLockMap] = useState<LockMap>({});
  const locksRef = useRef<Record<string, LockEntry>>({});

  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockExpiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeqRef = useRef<number | null>(null);

  const setLockMapRef = useRef(setLockMap);
  setLockMapRef.current = setLockMap;

  const updateLockMap = useCallback((updater: (prev: LockMap) => LockMap) => {
    setLockMapRef.current(updater);
  }, []);

  useEffect(() => {
    if (!eventId || !baseUrl || !deviceId || !accessToken) return;
    lastSeqRef.current = null;
    locksRef.current = {};
    setLockMap({});

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
      if (lockExpiryTimerRef.current != null) {
        clearInterval(lockExpiryTimerRef.current);
        lockExpiryTimerRef.current = null;
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
      const lastSeq = lastSeqRef.current ?? 0;
      ws = new WebSocket(wsUrl(baseUrl));
      if (__DEV__) {
        console.log("[ws.mobile] connect", { eventId, baseUrl, lastSeq });
      }
      resetHeartbeatTimer();

      ws.onopen = () => {
        if (__DEV__) {
          console.log("[ws.mobile] open", { eventId, baseUrl });
        }
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        ws?.send(JSON.stringify({ type: "connection.hello", protocolVersion: 1, token: accessToken, deviceId }));
        resetHeartbeatTimer();
      };

      ws.onmessage = (event) => {
        resetHeartbeatTimer();
        const data = parseRealtimeMessageData(event.data);
        if (data == null) return;
        if (data.type === "connection.ready") {
          ws?.send(JSON.stringify({ type: "sync.subscribe", eventId, lastSeq }));
          return;
        }
        if (data.type === "heartbeat" || data.type === "connection.heartbeat") return;
        const seq = getMessageSeq(data);
        if (seq != null && data.type !== "lock_snapshot" && lastSeqRef.current != null && seq <= lastSeqRef.current) return;
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

        if (data.type === "lock_acquired" || data.type === "lock_renewed" || data.type === "lock_snapshot" || data.type === "lock_released") {
          locksRef.current = expireLocks(applyLockEvent(locksRef.current, data));
          setLockMap(Object.fromEntries(Object.entries(locksRef.current).map(([id, lock]) => [id, lock.deviceId])));
          return;
        }
        const invalidation = getRealtimeInvalidation(data);
        if (invalidation.invalidateAudit) {
          queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
        }
        if (invalidation.invalidateParticipants) {
          if (data.type === "participant_checked_in" || data.type === "participant_checkin_reverted") {
            queryClient.setQueryData(["takeout-event-participants", eventId], (participants: unknown) =>
              Array.isArray(participants) ? applyParticipantCheckinPatch(participants, data, data.type === "participant_checked_in") : participants,
            );
          } else if (data.type === "participant_updated") {
            queryClient.setQueryData(["takeout-event-participants", eventId], (participants: unknown) =>
              Array.isArray(participants) ? applyParticipantUpdatePatch(participants, data) : participants,
            );
          } else {
            queryClient.invalidateQueries({ queryKey: ["takeout-event-participants", eventId] });
          }
          if (__DEV__) {
            console.log("[ws.mobile] invalidated participants", { eventId, type: data.type });
          }
          return;
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
    lockExpiryTimerRef.current = setInterval(() => {
      locksRef.current = expireLocks(locksRef.current);
      setLockMap(Object.fromEntries(Object.entries(locksRef.current).map(([id, lock]) => [id, lock.deviceId])));
    }, 1000);

    return () => {
      isActive = false;
      clearTimers();
      if (ws != null) ws.close();
    };
  }, [eventId, baseUrl, deviceId, accessToken, queryClient, updateLockMap]);

  return { lockMap };
}

/** WS channel for desktop event list changes (archive/delete/unarchive). */
export const EVENTS_LIST_CHANNEL = "_events";

/**
 * Conecta ao canal global da lista de eventos. Ao receber events_list_changed, invalida a query de eventos
 * para que todos os staffs vejam a lista atualizada (eventos arquivados/apagados somem na hora).
 */
export function useEventsListRealtime(baseUrl: string | null, deviceId: string | null, accessToken: string | null): void {
  const queryClient = useQueryClient();
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeqRef = useRef<number | null>(null);

  useEffect(() => {
    if (!baseUrl || !deviceId || !accessToken) return;

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
      const lastSeq = lastSeqRef.current ?? 0;
      ws = new WebSocket(wsUrl(baseUrl));
      if (__DEV__) {
        console.log("[ws.mobile.events] connect", { baseUrl, lastSeq });
      }
      resetHeartbeatTimer();

      ws.onopen = () => {
        if (__DEV__) {
          console.log("[ws.mobile.events] open", { baseUrl });
        }
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        ws?.send(JSON.stringify({ type: "connection.hello", protocolVersion: 1, token: accessToken, deviceId }));
        resetHeartbeatTimer();
      };

      ws.onmessage = (event) => {
        resetHeartbeatTimer();
        const data = parseRealtimeMessageData(event.data);
        if (data == null) return;
        if (data.type === "connection.ready") { ws?.send(JSON.stringify({ type: "sync.subscribe", eventId: EVENTS_LIST_CHANNEL, lastSeq })); return; }
        if (data.type === "heartbeat" || data.type === "connection.heartbeat") return;
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
  }, [baseUrl, deviceId, accessToken, queryClient]);
}

export const realtimeConfig = {
  INITIAL_RECONNECT_DELAY_MS,
  MAX_RECONNECT_DELAY_MS,
  HEARTBEAT_TIMEOUT_MS,
} as const;
