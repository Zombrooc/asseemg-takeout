import type {
  AuditEvent,
  ConnectionInfo,
  EventParticipant,
  EventSummary,
  HealthResponse,
  TakeoutConfirmPayload,
  TakeoutConfirmResponse,
} from "./takeout-api-types";

export type { ConnectionInfo, EventParticipant, EventSummary, TakeoutConfirmPayload, TakeoutConfirmResponse };

function ensureSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function createTakeoutClient(config: {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
}) {
  const baseUrl = ensureSlash(config.baseUrl);

  async function authHeaders(): Promise<HeadersInit> {
    const token = await config.getAccessToken();
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }

  async function request<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
    const headers = init?.skipAuth ? { "Content-Type": "application/json", ...init?.headers } : { ...(await authHeaders()), ...init?.headers };
    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!res.ok) throw new TakeoutApiError(res.status, await res.text());
    return res.json() as Promise<T>;
  }

  return {
    getHealth: () => request<HealthResponse>("/health", { skipAuth: true }),
    getConnectionInfo: () => request<ConnectionInfo>("/pair/info", { skipAuth: true }),
    pair: (deviceId: string, pairingToken: string) =>
      request<{ access_token: string }>("/pair", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ device_id: deviceId, pairing_token: pairingToken }),
      }),
    getEvents: () => request<EventSummary[]>("/events"),
    getEventParticipants: (eventId: string) =>
      request<EventParticipant[]>(`/events/${encodeURIComponent(eventId)}/participants`),
    postTakeoutConfirm: (payload: TakeoutConfirmPayload) =>
      request<TakeoutConfirmResponse>("/takeout/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getAudit: (params?: { status?: string; from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.from) q.set("from", params.from);
      if (params?.to) q.set("to", params.to);
      const query = q.toString();
      return request<AuditEvent[]>(`/audit${query ? `?${query}` : ""}`);
    },
  };
}

export type TakeoutApi = ReturnType<typeof createTakeoutClient>;

export class TakeoutApiError extends Error {
  constructor(
    public status: number,
    body: string
  ) {
    super(`HTTP ${status}: ${body}`);
    this.name = "TakeoutApiError";
  }
}
