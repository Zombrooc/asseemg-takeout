import { participantStore } from "@/lib/participant-store";
import {
	getTakeoutDatabase,
	runTakeoutWrite,
	withTakeoutWriteTransaction,
} from "@/lib/storage/takeout-database";

const outboxListeners = new Set<() => void>();
export function onOutboxChanged(listener: () => void): () => void {
	outboxListeners.add(listener);
	return () => outboxListeners.delete(listener);
}
function notifyOutboxChanged(): void {
	for (const listener of outboxListeners) listener();
}

export type OperationStatus =
	| "pending"
	| "sending"
	| "acknowledged"
	| "conflict"
	| "failed";
export type SyncOperation = {
	operationId: string;
	eventId: string;
	entityId: string;
	action: "confirm_checkin";
	payload: Record<string, unknown>;
	sourceType: "json_sync" | "legacy_csv";
	expectedVersion?: number;
	status: OperationStatus;
	attempts: number;
	createdAt: number;
	nextRetryAt: number;
	lastError?: string | null;
	leaseExpiresAt?: number | null;
};
type OperationRow = {
	operation_id: string;
	event_id: string;
	entity_id: string;
	action: "confirm_checkin";
	payload_json: string;
	source_type: "json_sync" | "legacy_csv";
	expected_version: number | null;
	status: OperationStatus;
	attempts: number;
	created_at: number;
	next_retry_at: number;
	last_error: string | null;
	lease_expires_at: number | null;
};
function rowToOperation(row: OperationRow): SyncOperation {
	return {
		operationId: row.operation_id,
		eventId: row.event_id,
		entityId: row.entity_id,
		action: row.action,
		payload: JSON.parse(row.payload_json) as Record<string, unknown>,
		sourceType: row.source_type,
		expectedVersion: row.expected_version ?? undefined,
		status: row.status,
		attempts: row.attempts,
		createdAt: row.created_at,
		nextRetryAt: row.next_retry_at,
		lastError: row.last_error,
		leaseExpiresAt: row.lease_expires_at,
	};
}

const SEND_LEASE_MS = 30_000;

export function retryAt(attempts: number, now = Date.now()): number {
	const base = Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 8));
	return (
		now + base + Math.floor(Math.random() * Math.max(1, Math.floor(base * 0.2)))
	);
}

/** Stores intent and provisional state in one SQLite transaction before UI changes. */
export async function enqueueCheckin(
	operation: Omit<
		SyncOperation,
		"status" | "attempts" | "createdAt" | "nextRetryAt"
	>,
): Promise<SyncOperation> {
	const now = Date.now();
	const complete: SyncOperation = {
		...operation,
		status: "pending",
		attempts: 0,
		createdAt: now,
		nextRetryAt: now,
	};
	await withTakeoutWriteTransaction(async (tx) => {
		await tx.runAsync(
			"INSERT INTO sync_operations(operation_id,event_id,entity_id,action,payload_json,expected_version,source_type,status,attempts,created_at,next_retry_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
			complete.operationId,
			complete.eventId,
			complete.entityId,
			complete.action,
			JSON.stringify(complete.payload),
			complete.expectedVersion ?? null,
			complete.sourceType,
			complete.status,
			0,
			now,
			now,
			now,
		);
		await tx.runAsync(
			"INSERT INTO local_checkin_projection(event_id,source_type,entity_id,state,operation_id,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(event_id,source_type,entity_id) DO UPDATE SET state=excluded.state, operation_id=excluded.operation_id, updated_at=excluded.updated_at",
			complete.eventId,
			complete.sourceType,
			complete.entityId,
			"pending",
			complete.operationId,
			now,
		);
	});
	participantStore.setSyncStatus(
		complete.eventId,
		complete.sourceType,
		complete.entityId,
		"pending",
		complete.operationId,
	);
	notifyOutboxChanged();
	return complete;
}
export async function getReadyOperations(
	now = Date.now(),
): Promise<SyncOperation[]> {
	const database = await getTakeoutDatabase();
	const rows = await database.getAllAsync<OperationRow>(
		`SELECT * FROM sync_operations o WHERE o.status='pending' AND o.next_retry_at <= ? AND NOT EXISTS (SELECT 1 FROM sync_operations earlier WHERE earlier.event_id=o.event_id AND earlier.source_type=o.source_type AND earlier.entity_id=o.entity_id AND earlier.created_at < o.created_at AND earlier.status IN ('pending','sending')) ORDER BY o.created_at`,
		now,
	);
	return rows.map(rowToOperation);
}
export async function getActiveOperations(): Promise<SyncOperation[]> {
	const rows = await (await getTakeoutDatabase()).getAllAsync<OperationRow>(
		"SELECT * FROM sync_operations WHERE status!='acknowledged' ORDER BY created_at",
	);
	return rows.map(rowToOperation);
}
export async function markSending(
	operationId: string,
	now = Date.now(),
): Promise<boolean> {
	const result = await runTakeoutWrite((database) =>
		database.runAsync(
			"UPDATE sync_operations SET status='sending', attempts=attempts+1, lease_expires_at=?, updated_at=? WHERE operation_id=? AND status='pending'",
			now + SEND_LEASE_MS,
			now,
			operationId,
		),
	);
	return result.changes === 1;
}
export async function acknowledgeOperation(
	operation: SyncOperation,
): Promise<void> {
	const now = Date.now();
	await withTakeoutWriteTransaction(async (tx) => {
		await tx.runAsync(
			"UPDATE sync_operations SET status='acknowledged', acknowledged_at=?, lease_expires_at=NULL, updated_at=? WHERE operation_id=? AND status!='acknowledged'",
			now,
			now,
			operation.operationId,
		);
		await tx.runAsync(
			"UPDATE local_checkin_projection SET state='authoritative', updated_at=? WHERE event_id=? AND source_type=? AND entity_id=? AND operation_id=?",
			now,
			operation.eventId,
			operation.sourceType,
			operation.entityId,
			operation.operationId,
		);
		await tx.runAsync(
			"UPDATE participant_entities SET authoritative_checkin=1,payload_json=json_set(payload_json,'$.checkinDone',1),updated_at=? WHERE event_id=? AND source_type=? AND entity_id=?",
			now,
			operation.eventId,
			operation.sourceType,
			operation.entityId,
		);
	});
	participantStore.setAuthoritativeCheckin(
		operation.eventId,
		operation.sourceType,
		operation.entityId,
		true,
	);
	notifyOutboxChanged();
}
export async function rejectOperation(
	operation: SyncOperation,
	reason: string,
): Promise<void> {
	const now = Date.now();
	await withTakeoutWriteTransaction(async (tx) => {
		await tx.runAsync(
			"UPDATE sync_operations SET status='conflict', last_error=?, lease_expires_at=NULL, updated_at=? WHERE operation_id=? AND status!='acknowledged'",
			reason,
			now,
			operation.operationId,
		);
		await tx.runAsync(
			"UPDATE local_checkin_projection SET state='conflict', updated_at=? WHERE event_id=? AND source_type=? AND entity_id=? AND operation_id=?",
			now,
			operation.eventId,
			operation.sourceType,
			operation.entityId,
			operation.operationId,
		);
	});
	participantStore.setSyncStatus(
		operation.eventId,
		operation.sourceType,
		operation.entityId,
		"conflict",
		operation.operationId,
	);
	notifyOutboxChanged();
}
export async function failOperation(
	operation: SyncOperation,
	reason: string,
): Promise<void> {
	const now = Date.now();
	await withTakeoutWriteTransaction(async (tx) => {
		await tx.runAsync(
			"UPDATE sync_operations SET status='failed', last_error=?, lease_expires_at=NULL, updated_at=? WHERE operation_id=? AND status!='acknowledged'",
			reason.slice(0, 500),
			now,
			operation.operationId,
		);
		await tx.runAsync(
			"UPDATE local_checkin_projection SET state='failed', updated_at=? WHERE event_id=? AND source_type=? AND entity_id=? AND operation_id=?",
			now,
			operation.eventId,
			operation.sourceType,
			operation.entityId,
			operation.operationId,
		);
	});
	participantStore.setSyncStatus(
		operation.eventId,
		operation.sourceType,
		operation.entityId,
		"failed",
		operation.operationId,
	);
	notifyOutboxChanged();
}
export async function retryOperation(
	operation: SyncOperation,
	message: string,
	now = Date.now(),
): Promise<number> {
	const nextRetryAt = retryAt(operation.attempts + 1, now);
	await runTakeoutWrite((database) =>
		database.runAsync(
			"UPDATE sync_operations SET status='pending', next_retry_at=?, last_error=?, lease_expires_at=NULL, updated_at=? WHERE operation_id=? AND status!='acknowledged'",
			nextRetryAt,
			message.slice(0, 500),
			now,
			operation.operationId,
		),
	);
	participantStore.setSyncStatus(
		operation.eventId,
		operation.sourceType,
		operation.entityId,
		"pending",
		operation.operationId,
	);
	notifyOutboxChanged();
	return nextRetryAt;
}
export async function recoverExpiredSending(now = Date.now()): Promise<number> {
	const result = await runTakeoutWrite((database) =>
		database.runAsync(
			"UPDATE sync_operations SET status='pending', next_retry_at=?, lease_expires_at=NULL, last_error=COALESCE(last_error,'Result unknown after interrupted send'), updated_at=? WHERE status='sending' AND (lease_expires_at IS NULL OR lease_expires_at<=?)",
			now,
			now,
			now,
		),
	);
	if (result.changes > 0) notifyOutboxChanged();
	return Number(result.changes);
}
export async function nextOperationWakeAt(): Promise<number | null> {
	const row = await (await getTakeoutDatabase()).getFirstAsync<{
		wake_at: number | null;
	}>(
		"SELECT MIN(CASE WHEN status='sending' THEN COALESCE(lease_expires_at,next_retry_at) ELSE next_retry_at END) wake_at FROM sync_operations WHERE status IN ('pending','sending')",
	);
	return row?.wake_at ?? null;
}
export async function pendingOperationCount(): Promise<number> {
	const row = await (await getTakeoutDatabase()).getFirstAsync<{
		count: number;
	}>(
		"SELECT COUNT(*) count FROM sync_operations WHERE status IN ('pending','sending')",
	);
	return row?.count ?? 0;
}

export const outboxConfig = { SEND_LEASE_MS } as const;
