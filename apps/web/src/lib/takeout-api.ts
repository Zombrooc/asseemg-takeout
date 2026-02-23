const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_TAKEOUT_API_URL) ||
  "http://127.0.0.1:5555";

export type HealthResponse = { status: string };
export type ConnectionInfo = { baseUrl: string; pairingToken: string; expiresAt: string };
export type AuditEvent = {
  request_id: string;
  ticket_id: string;
  device_id: string;
  status: "CONFIRMED" | "DUPLICATE" | "FAILED";
  payload_json: string | null;
  created_at: string;
};
export type AuditParams = { status?: string; from?: string; to?: string };

export type EventSummary = {
  eventId: string;
  name: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  importedAt: string;
  archivedAt?: string | null;
};

export type EventParticipant = {
  id: string;
  name: string | null;
  cpf: string | null;
  ticketId: string;
  sourceTicketId?: string | null;
  qrCode: string;
  checkinDone: boolean;
};

export type TakeoutConfirmPayload = {
  request_id: string;
  ticket_id: string;
  device_id: string;
  payload_json?: string;
};

export type TakeoutConfirmResponse = { status: string };

/** Same structure as thevent sync/checkin pull and POST /sync/import body. */
export type CustomFormResponse = {
  name: string;
  label: string;
  type: string;
  response: unknown;
};
export type PullParticipant = {
  seatId: string;
  ticketId: string;
  ticketName: string;
  qrCode: string;
  participantName: string;
  cpf: string;
  birthDate: string | null;
  age: number | null;
  customFormResponses: CustomFormResponse[];
  checkinDone: boolean;
  checkedInAt: string | null;
};
export type PullResponse = {
  eventId: string;
  event: { id: string; name: string; startDate?: string; endDate?: string | null; startTime?: string } | null;
  exportedAt: string;
  customForm: unknown[];
  participants: PullParticipant[];
  checkins: unknown[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function getConnectionInfo(): Promise<ConnectionInfo> {
  return request<ConnectionInfo>("/pair/info");
}

export async function renewPairingToken(): Promise<ConnectionInfo> {
  return request<ConnectionInfo>("/pair/renew", { method: "POST" });
}

export async function getAudit(params?: AuditParams): Promise<AuditEvent[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const query = q.toString();
  return request<AuditEvent[]>(`/audit${query ? `?${query}` : ""}`);
}

/** Import pull JSON (eventId, event, participants, customForm, checkins). Saves to DB and returns the same data. */
export async function postImportJson(data: PullResponse): Promise<PullResponse> {
  const res = await fetch(`${BASE_URL}/sync/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PullResponse>;
}

export async function getEvents(includeArchived?: boolean): Promise<EventSummary[]> {
  const q = includeArchived ? "?includeArchived=true" : "";
  return request<EventSummary[]>(`/events${q}`);
}

export async function postEventArchive(eventId: string): Promise<{ archived: boolean }> {
  const res = await fetch(`${BASE_URL}/events/${encodeURIComponent(eventId)}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ archived: boolean }>;
}

export async function deleteEvent(eventId: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE_URL}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ deleted: boolean }>;
}

export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  return request<EventParticipant[]>(`/events/${encodeURIComponent(eventId)}/participants`);
}

export async function postTakeoutConfirm(payload: TakeoutConfirmPayload): Promise<TakeoutConfirmResponse> {
  const res = await fetch(`${BASE_URL}/takeout/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<TakeoutConfirmResponse>;
}

export function getTakeoutBaseUrl(): string {
  return BASE_URL;
}
