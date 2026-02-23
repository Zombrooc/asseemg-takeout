import type {
  AuditEvent,
  ConnectionInfo,
  EventParticipant,
  EventSummary,
  HealthResponse,
  SyncEvent,
  TakeoutConfirmConflictResponse,
  TakeoutConfirmPayload,
  TakeoutConfirmResponse,
} from "./takeout-api-types";

export type {
  ConnectionInfo,
  EventParticipant,
  EventSummary,
  TakeoutConfirmConflictResponse,
  TakeoutConfirmPayload,
  TakeoutConfirmResponse,
};

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
    const bodyText = await res.text();
    if (!res.ok) throw new TakeoutApiError(res.status, bodyText);
    return JSON.parse(bodyText) as T;
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
    postResetEventCheckins: (eventId: string) =>
      request<{ deleted: number }>(`/events/${encodeURIComponent(eventId)}/checkins/reset`, {
        method: "POST",
      }),
    getSyncEvents: (eventId: string, sinceSeq?: number) => {
      const params = new URLSearchParams({ eventId });
      if (sinceSeq != null) params.set("sinceSeq", String(sinceSeq));
      return request<{ events: SyncEvent[]; latestSeq: number }>(`/sync/events?${params.toString()}`);
    },
    postLocksAcquire: (participantId: string, deviceId: string) =>
      request<{ acquired: boolean; heldBy?: string }>("/locks", {
        method: "POST",
        body: JSON.stringify({ participantId, deviceId }),
      }),
    postLocksRenew: (participantId: string, deviceId: string) =>
      request<{ renewed: boolean }>("/locks/renew", {
        method: "POST",
        body: JSON.stringify({ participantId, deviceId }),
      }),
    deleteLocksRelease: (participantId: string, deviceId?: string) => {
      const params = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : "";
      return request<{ released: boolean }>(`/locks/${encodeURIComponent(participantId)}${params}`, {
        method: "DELETE",
      });
    },
    getLocksStatus: (participantId: string) =>
      request<{ heldBy: string | null; expiresAt: number | null }>(
        `/locks/${encodeURIComponent(participantId)}`
      ),
  };
}

export type TakeoutApi = ReturnType<typeof createTakeoutClient>;

export class TakeoutApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`HTTP ${status}: ${body}`);
    this.name = "TakeoutApiError";
  }

  getConflictBody(): import("./takeout-api-types").TakeoutConfirmConflictResponse | null {
    if (this.status !== 409) return null;
    try {
      return JSON.parse(this.body) as import("./takeout-api-types").TakeoutConfirmConflictResponse;
    } catch {
      return null;
    }
  }
}
