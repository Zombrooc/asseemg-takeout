import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { acknowledgeOperation, getReadyOperations, rejectOperation, retryOperation } from "@/lib/takeout-queue";
import { markSending, onOutboxChanged } from "@/lib/storage/takeout-outbox";
import { TakeoutApiError } from "@/lib/takeout-api";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function TakeoutQueueProcessor() {
  const queryClient = useQueryClient();
  const { api, deviceId, isReachable } = useTakeoutConnection();
  const processing = useRef(false);

  useEffect(() => {
    if (!api || !deviceId || !isReachable) return;
    let cancelled = false;
    const process = async () => {
      if (cancelled || processing.current) return;
      const list = await getReadyOperations();
      if (list.length === 0) {
        return;
      }
      processing.current = true;
      const item = list[0];
      try {
        if (!(await markSending(item.operationId))) return;
        const payload = item.payload;
        const res = item.sourceType === "legacy_csv"
          ? await api.postLegacyTakeoutConfirm({ request_id: item.operationId, event_id: item.eventId, participant_id: item.entityId, device_id: String(payload.device_id), payload_json: typeof payload.payload_json === "string" ? payload.payload_json : undefined })
          : await api.postTakeoutConfirm({ request_id: item.operationId, ticket_id: String(payload.ticket_id), device_id: String(payload.device_id), payload_json: typeof payload.payload_json === "string" ? payload.payload_json : undefined });
        if (res.status === "CONFIRMED" || res.status === "DUPLICATE") {
          await acknowledgeOperation(item);
          queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
        } else {
          await retryOperation(item, `Unexpected response: ${res.status}`);
        }
      } catch (e) {
        if (e instanceof TakeoutApiError && e.status === 409) {
          await rejectOperation(item, e.body);
          queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
        } else {
          await retryOperation(item, e instanceof Error ? e.message : "Transport failure");
        }
      }
      processing.current = false;
      if (!cancelled) void process();
    };
    void process();
    const unsubscribe = onOutboxChanged(() => { void process(); });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [api, deviceId, isReachable, queryClient]);

  return null;
}
