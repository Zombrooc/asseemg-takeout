import {
  acknowledgeOperation,
  enqueueCheckin,
  getReadyOperations,
  pendingOperationCount,
  rejectOperation,
  retryOperation,
  type SyncOperation,
} from "@/lib/storage/takeout-outbox";

export type PendingConfirmItem = {
  request_id: string;
  ticket_id: string;
  device_id: string;
  payload_json?: string;
  created_at: string;
  event_id?: string;
  participant_id?: string;
  source_type?: "json_sync" | "legacy_csv";
};

export async function getPendingQueue(): Promise<PendingConfirmItem[]> {
  return (await getReadyOperations()).map((operation) => toPending(operation));
}

export async function addToQueue(item: Omit<PendingConfirmItem, "created_at">): Promise<void> {
  await enqueueCheckin({
    operationId: item.request_id,
    eventId: item.event_id ?? "unknown",
    entityId: item.participant_id ?? item.ticket_id,
    action: "confirm_checkin",
    sourceType: item.source_type ?? "json_sync",
    payload: {
      ticket_id: item.ticket_id,
      participant_id: item.participant_id,
      device_id: item.device_id,
      payload_json: item.payload_json,
    },
  });
}

export async function removeFromQueue(requestId: string): Promise<void> {
  const operation = (await getReadyOperations()).find((item) => item.operationId === requestId);
  if (operation) await acknowledgeOperation(operation);
}

function toPending(operation: SyncOperation): PendingConfirmItem {
  const payload = operation.payload;
  return {
    request_id: operation.operationId,
    ticket_id: String(payload.ticket_id ?? operation.entityId),
    device_id: String(payload.device_id ?? ""),
    payload_json: typeof payload.payload_json === "string" ? payload.payload_json : undefined,
    created_at: new Date(operation.createdAt).toISOString(),
    event_id: operation.eventId,
    participant_id: operation.entityId,
    source_type: operation.sourceType,
  };
}

export async function pendingQueueCount(): Promise<number> { return pendingOperationCount(); }
/** @deprecated Replacing the queue wholesale is incompatible with a durable outbox. */
export async function setQueue(_list: PendingConfirmItem[]): Promise<void> { throw new Error("setQueue was removed; enqueue individual operations instead"); }
export { acknowledgeOperation, getReadyOperations, rejectOperation, retryOperation };
