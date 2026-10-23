import { getTakeoutDatabase } from "@/lib/storage/takeout-database";

const outboxListeners = new Set<() => void>();
export function onOutboxChanged(listener: () => void): () => void { outboxListeners.add(listener); return () => outboxListeners.delete(listener); }
function notifyOutboxChanged(): void { for (const listener of outboxListeners) listener(); }

export type OperationStatus = "pending" | "sending" | "acknowledged" | "conflict" | "failed";
export type SyncOperation = {
  operationId: string; eventId: string; entityId: string; action: "confirm_checkin";
  payload: Record<string, unknown>; sourceType: "json_sync" | "legacy_csv";
  expectedVersion?: number; status: OperationStatus; attempts: number; createdAt: number;
  nextRetryAt: number; lastError?: string | null;
};
type OperationRow = { operation_id: string; event_id: string; entity_id: string; action: "confirm_checkin"; payload_json: string; source_type: "json_sync" | "legacy_csv"; expected_version: number | null; status: OperationStatus; attempts: number; created_at: number; next_retry_at: number; last_error: string | null };
function rowToOperation(row: OperationRow): SyncOperation { return { operationId: row.operation_id, eventId: row.event_id, entityId: row.entity_id, action: row.action, payload: JSON.parse(row.payload_json) as Record<string, unknown>, sourceType: row.source_type, expectedVersion: row.expected_version ?? undefined, status: row.status, attempts: row.attempts, createdAt: row.created_at, nextRetryAt: row.next_retry_at, lastError: row.last_error }; }

export function retryAt(attempts: number, now = Date.now()): number {
  const base = Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 8));
  return now + base + Math.floor(Math.random() * Math.max(1, Math.floor(base * 0.2)));
}

/** Stores intent and provisional state in one SQLite transaction before UI changes. */
export async function enqueueCheckin(operation: Omit<SyncOperation, "status" | "attempts" | "createdAt" | "nextRetryAt">): Promise<SyncOperation> {
  const database = await getTakeoutDatabase(); const now = Date.now();
  const complete: SyncOperation = { ...operation, status: "pending", attempts: 0, createdAt: now, nextRetryAt: now };
  await database.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(`INSERT INTO sync_operations(operation_id,event_id,entity_id,action,payload_json,expected_version,source_type,status,attempts,created_at,next_retry_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, complete.operationId, complete.eventId, complete.entityId, complete.action, JSON.stringify(complete.payload), complete.expectedVersion ?? null, complete.sourceType, complete.status, 0, now, now);
    await tx.runAsync(`INSERT INTO local_checkin_projection(entity_id,event_id,state,operation_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET state=excluded.state, operation_id=excluded.operation_id, updated_at=excluded.updated_at`, complete.entityId, complete.eventId, "pending", complete.operationId, now);
  });
  notifyOutboxChanged();
  return complete;
}
export async function getReadyOperations(now = Date.now()): Promise<SyncOperation[]> {
  const database = await getTakeoutDatabase();
  const rows = await database.getAllAsync<OperationRow>(`SELECT * FROM sync_operations o WHERE o.status IN ('pending','sending') AND o.next_retry_at <= ? AND NOT EXISTS (SELECT 1 FROM sync_operations earlier WHERE earlier.entity_id=o.entity_id AND earlier.created_at < o.created_at AND earlier.status IN ('pending','sending')) ORDER BY o.created_at`, now);
  return rows.map(rowToOperation);
}
export async function markSending(operationId: string): Promise<boolean> { const result = await (await getTakeoutDatabase()).runAsync("UPDATE sync_operations SET status='sending', attempts=attempts+1 WHERE operation_id=? AND status='pending'", operationId); return result.changes === 1; }
export async function acknowledgeOperation(operation: SyncOperation): Promise<void> { const database = await getTakeoutDatabase(); await database.withExclusiveTransactionAsync(async (tx) => { await tx.runAsync("UPDATE sync_operations SET status='acknowledged', acknowledged_at=? WHERE operation_id=?", Date.now(), operation.operationId); await tx.runAsync("UPDATE local_checkin_projection SET state='authoritative', updated_at=? WHERE entity_id=? AND operation_id=?", Date.now(), operation.entityId, operation.operationId); }); notifyOutboxChanged(); }
export async function rejectOperation(operation: SyncOperation, reason: string): Promise<void> { const database = await getTakeoutDatabase(); await database.withExclusiveTransactionAsync(async (tx) => { await tx.runAsync("UPDATE sync_operations SET status='conflict', last_error=? WHERE operation_id=?", reason, operation.operationId); await tx.runAsync("UPDATE local_checkin_projection SET state='conflict', updated_at=? WHERE entity_id=? AND operation_id=?", Date.now(), operation.entityId, operation.operationId); }); notifyOutboxChanged(); }
export async function retryOperation(operation: SyncOperation, message: string): Promise<void> { await (await getTakeoutDatabase()).runAsync("UPDATE sync_operations SET status='pending', next_retry_at=?, last_error=? WHERE operation_id=?", retryAt(operation.attempts + 1), message.slice(0, 500), operation.operationId); notifyOutboxChanged(); }
export async function pendingOperationCount(): Promise<number> { const row = await (await getTakeoutDatabase()).getFirstAsync<{ count: number }>("SELECT COUNT(*) count FROM sync_operations WHERE status IN ('pending','sending')"); return row?.count ?? 0; }
