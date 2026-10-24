import type { ParticipantAlert } from "@/lib/takeout-api-types";
import {
  createParticipantEntityKey,
  getTakeoutEntityId,
  participantEntityKey,
  type TakeoutParticipant,
  type TakeoutSourceType,
} from "@/lib/takeout-identity";
import { normalizeSearchValue } from "@pickup/api/participant-search";
import { useSyncExternalStore } from "react";
import { metricNow, recordTakeoutMetric } from "@/lib/takeout-metrics";

export type ParticipantSyncStatus =
  | "idle"
  | "pending"
  | "sending"
  | "acknowledged"
  | "conflict"
  | "failed";

export type ParticipantEntitySnapshot = {
  key: string;
  eventId: string;
  sourceType: TakeoutSourceType;
  entityId: string;
  participant: TakeoutParticipant;
  authoritativeCheckin: boolean;
  syncStatus: ParticipantSyncStatus;
  operationId: string | null;
  lockDeviceId: string | null;
  lockExpiresAt: number | null;
  lockSeq: number;
  alerts: readonly ParticipantAlert[];
  lastSeq: number;
};

type EventIndex = {
  ids: readonly string[];
  exact: Map<string, string>;
  searchable: Map<string, string>;
};
export type ParticipantCounts = { total: number; confirmed: number; pendingSync: number; conflicts: number };

const EMPTY_IDS: readonly string[] = Object.freeze([]);
const EMPTY_ALERTS: readonly ParticipantAlert[] = Object.freeze([]);
const EMPTY_COUNTS: ParticipantCounts = Object.freeze({ total: 0, confirmed: 0, pendingSync: 0, conflicts: 0 });

function eventKey(eventId: string, sourceType: TakeoutSourceType): string {
  return `${eventId}\u001f${sourceType}`;
}

function searchableText(participant: TakeoutParticipant): string {
  const record = participant as unknown as Record<string, unknown>;
  return normalizeSearchValue([
    record.name,
    record.cpf,
    record.birthDate,
    record.bibNumber,
    record.modality,
    record.team,
    record.qrCode,
    record.ticketId,
    record.sourceTicketId,
  ].filter((value) => value != null).join(" "));
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  return left === right || JSON.stringify(left) === JSON.stringify(right);
}

function exactValues(participant: TakeoutParticipant): string[] {
  const record = participant as unknown as Record<string, unknown>;
  return [record.id, record.cpf, record.bibNumber, record.qrCode, record.ticketId, record.sourceTicketId]
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map((value) => normalizeSearchValue(String(value)))
    .filter(Boolean);
}

class ParticipantStore {
  private entities = new Map<string, ParticipantEntitySnapshot>();
  private eventIndexes = new Map<string, EventIndex>();
  private counts = new Map<string, ParticipantCounts>();
  private entityListeners = new Map<string, Set<() => void>>();
  private listListeners = new Map<string, Set<() => void>>();
  private countListeners = new Map<string, Set<() => void>>();
  private expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

  get(key: string): ParticipantEntitySnapshot | null {
    return this.entities.get(key) ?? null;
  }

  getIds(eventId: string, sourceType: TakeoutSourceType): readonly string[] {
    return this.eventIndexes.get(eventKey(eventId, sourceType))?.ids ?? EMPTY_IDS;
  }

  getCounts(eventId: string, sourceType: TakeoutSourceType): ParticipantCounts {
    return this.counts.get(eventKey(eventId, sourceType)) ?? EMPTY_COUNTS;
  }

  searchIds(eventId: string, sourceType: TakeoutSourceType, query: string): readonly string[] {
    const startedAt = metricNow();
    const index = this.eventIndexes.get(eventKey(eventId, sourceType));
    if (!index) return EMPTY_IDS;
    const normalized = normalizeSearchValue(query);
    if (!normalized) return index.ids;
    const exact = index.exact.get(normalized);
    if (exact) return [exact];
    const result = index.ids.filter((key) => index.searchable.get(key)?.includes(normalized));
    recordTakeoutMetric("participant_search_ms", metricNow() - startedAt);
    return result;
  }

  subscribeEntity(key: string, listener: () => void): () => void {
    const listeners = this.entityListeners.get(key) ?? new Set();
    listeners.add(listener);
    this.entityListeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.entityListeners.delete(key);
    };
  }

  subscribeList(eventId: string, sourceType: TakeoutSourceType, listener: () => void): () => void {
    const key = eventKey(eventId, sourceType);
    const listeners = this.listListeners.get(key) ?? new Set();
    listeners.add(listener);
    this.listListeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listListeners.delete(key);
    };
  }

  subscribeCounts(eventId: string, sourceType: TakeoutSourceType, listener: () => void): () => void {
    const key = eventKey(eventId, sourceType);
    const listeners = this.countListeners.get(key) ?? new Set();
    listeners.add(listener);
    this.countListeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.countListeners.delete(key);
    };
  }

  hydrate(
    eventId: string,
    sourceType: TakeoutSourceType,
    participants: readonly TakeoutParticipant[],
    alertsByParticipantId: Readonly<Record<string, readonly ParticipantAlert[]>> = {},
  ): void {
    const startedAt = metricNow();
    const indexKey = eventKey(eventId, sourceType);
    const previousIds = this.eventIndexes.get(indexKey)?.ids ?? EMPTY_IDS;
    const nextIds: string[] = [];
    const exact = new Map<string, string>();
    const searchable = new Map<string, string>();

    for (const participant of participants) {
      const key = participantEntityKey(eventId, sourceType, participant);
      nextIds.push(key);
      searchable.set(key, searchableText(participant));
      for (const value of exactValues(participant)) exact.set(value, key);
      const previous = this.entities.get(key);
      const alerts = alertsByParticipantId[participant.id] ?? EMPTY_ALERTS;
      const authoritativeCheckin = participant.checkinDone;
      const participantUnchanged = previous != null && structurallyEqual(previous.participant, participant);
      const alertsUnchanged = previous != null && structurallyEqual(previous.alerts, alerts);
      if (
        participantUnchanged &&
        previous.authoritativeCheckin === authoritativeCheckin &&
        alertsUnchanged
      ) continue;
      this.entities.set(key, {
        key,
        eventId,
        sourceType,
        entityId: getTakeoutEntityId(participant, sourceType),
        participant: participantUnchanged && previous ? previous.participant : participant,
        authoritativeCheckin,
        syncStatus: previous?.syncStatus ?? "idle",
        operationId: previous?.operationId ?? null,
        lockDeviceId: previous?.lockDeviceId ?? null,
        lockExpiresAt: previous?.lockExpiresAt ?? null,
        lockSeq: previous?.lockSeq ?? 0,
        alerts: alertsUnchanged && previous ? previous.alerts : alerts,
        lastSeq: previous?.lastSeq ?? 0,
      });
      this.notifyEntity(key);
    }

    const ids = previousIds.length === nextIds.length && previousIds.every((id, i) => id === nextIds[i])
      ? previousIds
      : Object.freeze(nextIds);
    this.eventIndexes.set(indexKey, { ids, exact, searchable });
    if (ids !== previousIds) this.notifyList(indexKey);
    this.recomputeCounts(indexKey, nextIds);
    recordTakeoutMetric("participant_snapshot_ms", metricNow() - startedAt);
  }

  patchParticipant(
    eventId: string,
    sourceType: TakeoutSourceType,
    entityId: string,
    patch: Partial<TakeoutParticipant>,
    seq = 0,
  ): boolean {
    const key = createParticipantEntityKey(eventId, sourceType, entityId);
    const previous = this.entities.get(key);
    if (!previous || (seq > 0 && seq <= previous.lastSeq)) return false;
    const participant = { ...previous.participant, ...patch } as TakeoutParticipant;
    const searchableChanged = searchableText(previous.participant) !== searchableText(participant);
    const next = {
      ...previous,
      participant,
      authoritativeCheckin: participant.checkinDone,
      lastSeq: Math.max(previous.lastSeq, seq),
    };
    this.entities.set(key, next);
    this.updateCounts(previous, next);
    this.notifyEntity(key);
    if (searchableChanged) this.updateSearchIndex(eventId, sourceType, key, participant);
    return true;
  }

  upsertParticipant(
    eventId: string,
    sourceType: TakeoutSourceType,
    participant: TakeoutParticipant,
    seq = 0,
  ): boolean {
    const entityId = getTakeoutEntityId(participant, sourceType);
    const key = createParticipantEntityKey(eventId, sourceType, entityId);
    if (this.entities.has(key)) {
      return this.patchParticipant(eventId, sourceType, entityId, participant, seq);
    }
    const indexKey = eventKey(eventId, sourceType);
    const current = this.eventIndexes.get(indexKey) ?? {
      ids: EMPTY_IDS,
      exact: new Map<string, string>(),
      searchable: new Map<string, string>(),
    };
    const snapshot: ParticipantEntitySnapshot = {
      key,
      eventId,
      sourceType,
      entityId,
      participant,
      authoritativeCheckin: participant.checkinDone,
      syncStatus: "idle",
      operationId: null,
      lockDeviceId: null,
      lockExpiresAt: null,
      lockSeq: 0,
      alerts: EMPTY_ALERTS,
      lastSeq: seq,
    };
    this.entities.set(key, snapshot);
    const ids = Object.freeze([...current.ids, key]);
    this.eventIndexes.set(indexKey, { ...current, ids });
    this.rebuildEventIndex(eventId, sourceType);
    this.recomputeCounts(indexKey, ids);
    this.notifyEntity(key);
    this.notifyList(indexKey);
    return true;
  }

  setSyncStatus(
    eventId: string,
    sourceType: TakeoutSourceType,
    entityId: string,
    syncStatus: ParticipantSyncStatus,
    operationId: string | null,
  ): boolean {
    const key = createParticipantEntityKey(eventId, sourceType, entityId);
    const previous = this.entities.get(key);
    if (!previous || (previous.syncStatus === syncStatus && previous.operationId === operationId)) return false;
    const next = { ...previous, syncStatus, operationId };
    this.entities.set(key, next);
    this.updateCounts(previous, next);
    this.notifyEntity(key);
    return true;
  }

  setAuthoritativeCheckin(
    eventId: string,
    sourceType: TakeoutSourceType,
    entityId: string,
    done: boolean,
    seq = 0,
  ): boolean {
    const key = createParticipantEntityKey(eventId, sourceType, entityId);
    const previous = this.entities.get(key);
    if (!previous || (seq > 0 && seq <= previous.lastSeq)) return false;
    if (previous.authoritativeCheckin === done && seq <= previous.lastSeq) return false;
    const participant = previous.participant.checkinDone === done
      ? previous.participant
      : ({ ...previous.participant, checkinDone: done } as TakeoutParticipant);
    const next = {
      ...previous,
      participant,
      authoritativeCheckin: done,
      syncStatus: done ? "acknowledged" : previous.syncStatus,
      lastSeq: Math.max(previous.lastSeq, seq),
    };
    this.entities.set(key, next);
    this.updateCounts(previous, next);
    this.notifyEntity(key);
    return true;
  }

  setLock(
    eventId: string,
    sourceType: TakeoutSourceType,
    entityId: string,
    deviceId: string | null,
    expiresAt: number | null,
    seq: number,
  ): boolean {
    const key = createParticipantEntityKey(eventId, sourceType, entityId);
    const previous = this.entities.get(key);
    if (!previous || (seq > 0 && seq < previous.lockSeq)) return false;
    if (
      previous.lockDeviceId === deviceId &&
      previous.lockExpiresAt === expiresAt &&
      previous.lockSeq === seq
    ) return false;
    const visualChanged = previous.lockDeviceId !== deviceId;
    const timer = this.expiryTimers.get(key);
    if (timer) clearTimeout(timer);
    this.expiryTimers.delete(key);
    this.entities.set(key, {
      ...previous,
      lockDeviceId: deviceId,
      lockExpiresAt: expiresAt,
      lockSeq: Math.max(previous.lockSeq, seq),
    });
    if (visualChanged) this.notifyEntity(key);
    if (deviceId && expiresAt) {
      const delay = Math.max(0, expiresAt * 1000 - Date.now());
      this.expiryTimers.set(key, setTimeout(() => {
        const current = this.entities.get(key);
        if (!current || current.lockExpiresAt !== expiresAt || Date.now() < expiresAt * 1000) return;
        this.entities.set(key, { ...current, lockDeviceId: null, lockExpiresAt: null });
        this.expiryTimers.delete(key);
        this.notifyEntity(key);
      }, delay + 10));
    }
    return true;
  }

  setLockForParticipant(
    eventId: string,
    participantId: string,
    deviceId: string | null,
    expiresAt: number | null,
    seq: number,
  ): number {
    let changed = 0;
    for (const sourceType of ["json_sync", "legacy_csv"] as const) {
      for (const key of this.getIds(eventId, sourceType)) {
        const snapshot = this.entities.get(key);
        if (snapshot?.participant.id !== participantId) continue;
        if (this.setLock(eventId, sourceType, snapshot.entityId, deviceId, expiresAt, seq)) changed += 1;
      }
    }
    return changed;
  }

  resetForTests(): void {
    for (const timer of this.expiryTimers.values()) clearTimeout(timer);
    this.entities.clear();
    this.eventIndexes.clear();
    this.counts.clear();
    this.entityListeners.clear();
    this.listListeners.clear();
    this.countListeners.clear();
    this.expiryTimers.clear();
  }

  private rebuildEventIndex(eventId: string, sourceType: TakeoutSourceType): void {
    const key = eventKey(eventId, sourceType);
    const current = this.eventIndexes.get(key);
    if (!current) return;
    const exact = new Map<string, string>();
    const searchable = new Map<string, string>();
    for (const id of current.ids) {
      const participant = this.entities.get(id)?.participant;
      if (!participant) continue;
      searchable.set(id, searchableText(participant));
      for (const value of exactValues(participant)) exact.set(value, id);
    }
    this.eventIndexes.set(key, { ...current, exact, searchable });
  }

  private updateSearchIndex(
    eventId: string,
    sourceType: TakeoutSourceType,
    entityKey: string,
    participant: TakeoutParticipant,
  ): void {
    const key = eventKey(eventId, sourceType);
    const current = this.eventIndexes.get(key);
    if (!current) return;
    const exact = new Map(current.exact);
    for (const [value, indexedKey] of exact) {
      if (indexedKey === entityKey) exact.delete(value);
    }
    for (const value of exactValues(participant)) exact.set(value, entityKey);
    const searchable = new Map(current.searchable);
    searchable.set(entityKey, searchableText(participant));
    // Search membership may have changed. Status, lock and ACK changes never
    // take this path and preserve the exact list snapshot reference.
    const ids = Object.freeze([...current.ids]);
    this.eventIndexes.set(key, { ids, exact, searchable });
    this.notifyList(key);
  }

  private notifyEntity(key: string): void {
    for (const listener of this.entityListeners.get(key) ?? []) listener();
  }

  private notifyList(key: string): void {
    recordTakeoutMetric("list_ids_update");
    for (const listener of this.listListeners.get(key) ?? []) listener();
  }

  private recomputeCounts(key: string, ids: readonly string[]): void {
    let confirmed = 0;
    let pendingSync = 0;
    let conflicts = 0;
    for (const id of ids) {
      const entity = this.entities.get(id);
      if (!entity) continue;
      if (entity.authoritativeCheckin) confirmed += 1;
      if (entity.syncStatus === "pending" || entity.syncStatus === "sending") pendingSync += 1;
      if (entity.syncStatus === "conflict") conflicts += 1;
    }
    const next = { total: ids.length, confirmed, pendingSync, conflicts };
    const previous = this.counts.get(key);
    if (previous && previous.total === next.total && previous.confirmed === confirmed && previous.pendingSync === pendingSync && previous.conflicts === conflicts) return;
    this.counts.set(key, Object.freeze(next));
    for (const listener of this.countListeners.get(key) ?? []) listener();
  }

  private updateCounts(previous: ParticipantEntitySnapshot, next: ParticipantEntitySnapshot): void {
    const key = eventKey(next.eventId, next.sourceType);
    const current = this.counts.get(key);
    if (!current) return;
    const wasPending = previous.syncStatus === "pending" || previous.syncStatus === "sending";
    const isPending = next.syncStatus === "pending" || next.syncStatus === "sending";
    const updated = {
      total: current.total,
      confirmed: current.confirmed + Number(next.authoritativeCheckin) - Number(previous.authoritativeCheckin),
      pendingSync: current.pendingSync + Number(isPending) - Number(wasPending),
      conflicts: current.conflicts + Number(next.syncStatus === "conflict") - Number(previous.syncStatus === "conflict"),
    };
    if (updated.confirmed === current.confirmed && updated.pendingSync === current.pendingSync && updated.conflicts === current.conflicts) return;
    this.counts.set(key, Object.freeze(updated));
    for (const listener of this.countListeners.get(key) ?? []) listener();
  }
}

export const participantStore = new ParticipantStore();

export function useParticipantEntity(key: string | null): ParticipantEntitySnapshot | null {
  return useSyncExternalStore(
    (listener) => key ? participantStore.subscribeEntity(key, listener) : () => {},
    () => key ? participantStore.get(key) : null,
    () => key ? participantStore.get(key) : null,
  );
}

export function useParticipantIds(
  eventId: string,
  sourceType: TakeoutSourceType,
): readonly string[] {
  return useSyncExternalStore(
    (listener) => participantStore.subscribeList(eventId, sourceType, listener),
    () => participantStore.getIds(eventId, sourceType),
    () => participantStore.getIds(eventId, sourceType),
  );
}

export function useParticipantCounts(
  eventId: string,
  sourceType: TakeoutSourceType,
): ParticipantCounts {
  return useSyncExternalStore(
    (listener) => participantStore.subscribeCounts(eventId, sourceType, listener),
    () => participantStore.getCounts(eventId, sourceType),
    () => participantStore.getCounts(eventId, sourceType),
  );
}
