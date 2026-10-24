import type { WsTakeoutMessage } from "@pickup/api/takeout-contracts";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeDateOnly } from "@/lib/format-date";
import { participantStore } from "@/lib/participant-store";
import { takeoutSyncManager } from "@/lib/takeout-sync-manager";
import { useEffect } from "react";

const INITIAL_RECONNECT_DELAY_MS = 1_500;
const MAX_RECONNECT_DELAY_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 90_000;

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
  const syncManager = takeoutSyncManager;

  useEffect(() => {
    if (!eventId || !baseUrl || !deviceId || !accessToken) return;
    return syncManager.subscribe(eventId, async (data) => {
        const seq = getMessageSeq(data);
        if (data.type === "lock_acquired" || data.type === "lock_renewed" || data.type === "lock_snapshot" || data.type === "lock_released") {
          const released = data.type === "lock_released";
          participantStore.setLockForParticipant(
            eventId,
            data.participant_id,
            released ? null : data.device_id,
            released ? null : data.expires_at,
            data.seq,
          );
          return;
        }
        const invalidation = getRealtimeInvalidation(data);
        if (invalidation.invalidateAudit) {
          queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
        }
        if (invalidation.invalidateParticipants) {
          if (data.type === "participant_checked_in" || data.type === "participant_checkin_reverted") {
            const sourceType = data.source_type === "legacy_csv" ? "legacy_csv" : "json_sync";
            const entityId = sourceType === "legacy_csv" ? data.participant_id : data.ticket_id;
            if (entityId) participantStore.setAuthoritativeCheckin(eventId, sourceType, entityId, data.type === "participant_checked_in", seq ?? 0);
          } else if (data.type === "participant_updated") {
            const sourceType = data.source_type === "legacy_csv" ? "legacy_csv" : "json_sync";
            const entityId = sourceType === "legacy_csv" ? data.participant_id : data.ticket_id;
            if (entityId) {
              const patch = data.participant
                ? data.participant
                : {
                    ...(data.name !== undefined ? { name: data.name } : {}),
                    ...(data.cpf !== undefined ? { cpf: data.cpf } : {}),
                    ...(data.birthDate !== undefined ? { birthDate: normalizeDateOnly(data.birthDate) } : {}),
                    ...(data.shirtSize !== undefined ? { shirtSize: data.shirtSize } : {}),
                    ...(data.team !== undefined ? { team: data.team } : {}),
                    ...(data.modality !== undefined ? { modality: data.modality } : {}),
                    ...(data.ticketName !== undefined ? { ticketName: data.ticketName } : {}),
                  };
              if (data.participant) {
                participantStore.upsertParticipant(eventId, sourceType, data.participant, seq ?? 0);
              } else {
                participantStore.patchParticipant(eventId, sourceType, entityId, patch, seq ?? 0);
              }
            }
          } else {
            queryClient.invalidateQueries({ queryKey: ["takeout-event-participants", eventId] });
          }
          if (__DEV__) {
            console.log("[ws.mobile] invalidated participants", { eventId, type: data.type });
          }
          return;
        }
      });
  }, [eventId, baseUrl, deviceId, accessToken, queryClient]);

  return { lockMap: {} };
}

/** WS channel for desktop event list changes (archive/delete/unarchive). */
export const EVENTS_LIST_CHANNEL = "_events";

/**
 * Conecta ao canal global da lista de eventos. Ao receber events_list_changed, invalida a query de eventos
 * para que todos os staffs vejam a lista atualizada (eventos arquivados/apagados somem na hora).
 */
export function useEventsListRealtime(baseUrl: string | null, deviceId: string | null, accessToken: string | null): void {
  const queryClient = useQueryClient();
  const syncManager = takeoutSyncManager;

  useEffect(() => {
    if (!baseUrl || !deviceId || !accessToken) return;
    return syncManager.subscribe(EVENTS_LIST_CHANNEL, (data) => {
        const invalidation = getRealtimeInvalidation(data);
        if (invalidation.invalidateEvents) {
          queryClient.invalidateQueries({ queryKey: ["takeout-events"] });
        }
      });
  }, [baseUrl, deviceId, accessToken, queryClient]);
}

export const realtimeConfig = {
  INITIAL_RECONNECT_DELAY_MS,
  MAX_RECONNECT_DELAY_MS,
  HEARTBEAT_TIMEOUT_MS,
} as const;
