import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { getPendingQueue, removeFromQueue, type PendingConfirmItem } from "@/lib/takeout-queue";
import { useEffect, useRef } from "react";

const RETRY_DELAY_MS = 3000;
const MAX_BACKOFF_MS = 60000;

export function TakeoutQueueProcessor() {
  const { api, deviceId, isReachable } = useTakeoutConnection();
  const processing = useRef(false);
  const backoff = useRef(RETRY_DELAY_MS);

  useEffect(() => {
    if (!api || !deviceId || !isReachable) return;
    let cancelled = false;
    const process = async () => {
      if (cancelled || processing.current) return;
      const list = await getPendingQueue();
      if (list.length === 0) {
        if (!cancelled) setTimeout(process, RETRY_DELAY_MS);
        return;
      }
      processing.current = true;
      const item = list[0] as PendingConfirmItem;
      try {
        const res = await api.postTakeoutConfirm({
          request_id: item.request_id,
          ticket_id: item.ticket_id,
          device_id: item.device_id,
          payload_json: item.payload_json,
        });
        if (res.status === "CONFIRMED" || res.status === "DUPLICATE") {
          await removeFromQueue(item.request_id);
          backoff.current = RETRY_DELAY_MS;
        } else {
          backoff.current = Math.min(backoff.current * 1.5, MAX_BACKOFF_MS);
        }
      } catch {
        backoff.current = Math.min(backoff.current * 1.5, MAX_BACKOFF_MS);
      }
      processing.current = false;
      if (!cancelled) setTimeout(process, backoff.current);
    };
    const id = setTimeout(process, RETRY_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [api, deviceId, isReachable]);

  return null;
}
