import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getTakeoutBaseUrl } from "./takeout-api";

const RECONNECT_DELAY_MS = 3000;

function wsUrl(baseUrl: string, eventId: string, deviceId: string): string {
  const base = baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  const params = new URLSearchParams({ event_id: eventId, device_id: deviceId });
  return `${base}/ws?${params.toString()}`;
}

/**
 * Subscribes to takeout WebSocket for the given event and invalidates
 * participants query on participant_checked_in so the table updates in real time.
 * Reconnects on close after a delay (unless effect is cleaning up).
 */
export function useTakeoutWs(eventId: string | undefined): void {
  const queryClient = useQueryClient();
  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const baseUrl = getTakeoutBaseUrl();
    const url = wsUrl(baseUrl, eventId, "web-dashboard");
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as { type?: string };
        if (data.type === "participant_checked_in") {
          const id = eventIdRef.current;
          if (id) {
            queryClient.invalidateQueries({ queryKey: ["takeout", "events", id, "participants"] });
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setReconnectTrigger((n) => n + 1);
      }, RECONNECT_DELAY_MS);
    };

    return () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      ws.close();
    };
  }, [eventId, queryClient, reconnectTrigger]);
}
