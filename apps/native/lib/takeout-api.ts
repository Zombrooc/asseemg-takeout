import type {
  AuditEvent,
  ConnectionInfo,
  EventParticipant,
  EventSummary,
  HealthResponse,
  LegacyEventParticipant,
  LegacyReservedNumber,
  LegacyReserveNumbersPayload,
  LegacyReserveNumbersResponse,
  LegacyTakeoutConfirmPayload,
  LegacyTakeoutConfirmResponse,
  NetworkAddressesResponse,
  ParticipantSearchMode,
  SyncEvent,
  TakeoutConfirmConflictResponse,
  TakeoutConfirmPayload,
  TakeoutConfirmResponse,
  TakeoutUndoPayload,
  TakeoutUndoResponse,
  LegacyTakeoutUndoPayload,
  LegacyTakeoutUndoResponse,
  CreateLegacyParticipantPayload,
} from "./takeout-api-types";

export type {
  ConnectionInfo,
  EventParticipant,
  EventSummary,
  LegacyEventParticipant,
  LegacyReservedNumber,
  LegacyReserveNumbersPayload,
  LegacyReserveNumbersResponse,
  NetworkAddressesResponse,
  ParticipantSearchMode,
  TakeoutConfirmConflictResponse,
  TakeoutConfirmPayload,
  TakeoutConfirmResponse,
  LegacyTakeoutConfirmPayload,
  LegacyTakeoutConfirmResponse,
  TakeoutUndoPayload,
  TakeoutUndoResponse,
  LegacyTakeoutUndoPayload,
  LegacyTakeoutUndoResponse,
  CreateLegacyParticipantPayload,
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
    getNetworkAddresses: () => request<NetworkAddressesResponse>("/network/addresses", { skipAuth: true }),
    getConnectionInfo: () => request<ConnectionInfo>("/pair/info", { skipAuth: true }),
    pair: (deviceId: string, pairingToken: string, operatorAlias: string) =>
      request<{ access_token: string }>("/pair", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          device_id: deviceId,
          pairing_token: pairingToken,
          operator_alias: operatorAlias,
        }),
      }),
    getEvents: () => request<EventSummary[]>("/events"),
    getEventParticipants: (eventId: string) =>
      request<EventParticipant[]>(`/events/${encodeURIComponent(eventId)}/participants`),
    getLegacyEventParticipants: (eventId: string) =>
      request<LegacyEventParticipant[]>(`/events/${encodeURIComponent(eventId)}/legacy-participants`),
    getLegacyReservedNumbers: (eventId: string, includeUsed = false) => {
      const q = includeUsed ? "?includeUsed=true" : "";
      return request<LegacyReservedNumber[]>(
        `/events/${encodeURIComponent(eventId)}/legacy-reservations${q}`
      );
    },
    postLegacyReserveNumbers: (eventId: string, payload: LegacyReserveNumbersPayload) =>
      request<LegacyReserveNumbersResponse>(`/events/${encodeURIComponent(eventId)}/legacy-reservations`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    postLegacyCreateParticipant: (eventId: string, payload: CreateLegacyParticipantPayload) =>
      request<LegacyEventParticipant>(`/events/${encodeURIComponent(eventId)}/legacy-participants`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    searchEventParticipants: (eventId: string, q: string, mode: ParticipantSearchMode) => {
      const params = new URLSearchParams({ q, mode });
      return request<EventParticipant[]>(
        `/events/${encodeURIComponent(eventId)}/participants/search?${params.toString()}`
      );
    },
    searchLegacyEventParticipants: (
      eventId: string,
      q: string,
      mode: "numero" | "nome" | "cpf" | "birth_date" | "modality"
    ) => {
      const params = new URLSearchParams({ q, mode });
      return request<LegacyEventParticipant[]>(
        `/events/${encodeURIComponent(eventId)}/legacy-participants/search?${params.toString()}`
      );
    },
    postTakeoutConfirm: (payload: TakeoutConfirmPayload) =>
      request<TakeoutConfirmResponse>("/takeout/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    postLegacyTakeoutConfirm: (payload: LegacyTakeoutConfirmPayload) =>
      request<LegacyTakeoutConfirmResponse>("/takeout/confirm/legacy", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getAudit: (params: { eventId: string; status?: string; from?: string; to?: string }) => {
      if (!params.eventId) {
        throw new Error("eventId is required");
      }
      const q = new URLSearchParams();
      q.set("eventId", params.eventId);
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
