import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

function wsUrl(baseUrl: string, eventId: string, deviceId: string, lastSeq?: string): string {
  const base = baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  const params = new URLSearchParams({ event_id: eventId, device_id: deviceId });
  if (lastSeq != null) params.set("last_seq", lastSeq);
  return `${base}/ws?${params.toString()}`;
}

/** participantId -> deviceId que está atendendo */
export type LockMap = Record<string, string>;

export function useTakeoutRealtime(
  eventId: string | undefined,
  baseUrl: string | null,
  deviceId: string | null
): { lockMap: LockMap } {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [lockMap, setLockMap] = useState<LockMap>({});

  const setLockMapRef = useRef(setLockMap);
  setLockMapRef.current = setLockMap;

  const updateLockMap = useCallback((updater: (prev: LockMap) => LockMap) => {
    setLockMapRef.current(updater);
  }, []);

  useEffect(() => {
    if (!eventId || !baseUrl || !deviceId) return;
    const url = wsUrl(baseUrl, eventId, deviceId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          participant_id?: string;
          device_id?: string;
        };
        if (data.type === "participant_checked_in") {
          queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
          queryClient.invalidateQueries({ queryKey: ["takeout-event-participants", eventId] });
        } else if (data.type === "lock_acquired" && data.participant_id != null && data.device_id != null) {
          updateLockMap((prev) => ({ ...prev, [data.participant_id!]: data.device_id! }));
        } else if (data.type === "lock_released" && data.participant_id != null) {
          updateLockMap((prev) => {
            const next = { ...prev };
            delete next[data.participant_id!];
            return next;
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
      wsRef.current = null;
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
export function useEventsListRealtime(
  baseUrl: string | null,
  deviceId: string | null
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!baseUrl || !deviceId) return;
    const url = wsUrl(baseUrl, EVENTS_LIST_CHANNEL, deviceId);
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as { type?: string };
        if (data.type === "events_list_changed") {
          queryClient.invalidateQueries({ queryKey: ["takeout-events"] });
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [baseUrl, deviceId, queryClient]);
}
