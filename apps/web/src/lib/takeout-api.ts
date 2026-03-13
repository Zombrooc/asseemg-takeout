import type {
  AuditEvent,
  ConnectionInfo,
  EventParticipant,
  EventSummary,
  HealthResponse,
  LegacyEventParticipant,
  LegacyImportResponse,
  LegacyReservedNumber,
  LegacyReserveNumbersPayload,
  LegacyReserveNumbersResponse,
  LegacyTakeoutConfirmPayload,
  LegacyTakeoutConfirmResponse,
  LegacyTakeoutUndoPayload,
  LegacyTakeoutUndoResponse,
  NetworkAddressesResponse,
  ParticipantSearchMode,
  CreateLegacyParticipantPayload,
  TakeoutConfirmPayload,
  TakeoutConfirmResponse,
  TakeoutUndoPayload,
  TakeoutUndoResponse,
  UpdateEventParticipantPayload,
  UpdateLegacyParticipantPayload,
} from "@pickup/api/takeout-contracts";

const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_TAKEOUT_API_URL) ||
  "http://127.0.0.1:5555";

export type {
  AuditEvent,
  ConnectionInfo,
  EventParticipant,
  EventSummary,
  HealthResponse,
  LegacyEventParticipant,
  LegacyImportResponse,
  LegacyReservedNumber,
  LegacyReserveNumbersPayload,
  LegacyReserveNumbersResponse,
  LegacyTakeoutConfirmPayload,
  LegacyTakeoutConfirmResponse,
  LegacyTakeoutUndoPayload,
  LegacyTakeoutUndoResponse,
  NetworkAddressesResponse,
  ParticipantSearchMode,
  CreateLegacyParticipantPayload,
  TakeoutConfirmPayload,
  TakeoutConfirmResponse,
  TakeoutUndoPayload,
  TakeoutUndoResponse,
  UpdateEventParticipantPayload,
  UpdateLegacyParticipantPayload,
};
export type AuditParams = { eventId: string; status?: string; from?: string; to?: string };

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

export async function getNetworkAddresses(): Promise<NetworkAddressesResponse> {
  return request<NetworkAddressesResponse>("/network/addresses");
}

export async function getConnectionInfo(): Promise<ConnectionInfo> {
  return request<ConnectionInfo>("/pair/info");
}

export async function renewPairingToken(): Promise<ConnectionInfo> {
  return request<ConnectionInfo>("/pair/renew", { method: "POST" });
}

export async function getAudit(params: AuditParams): Promise<AuditEvent[]> {
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

export async function postImportLegacyCsv(formData: FormData): Promise<LegacyImportResponse> {
  const res = await fetch(`${BASE_URL}/admin/import/legacy-csv`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LegacyImportResponse>;
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

export async function postEventUnarchive(eventId: string): Promise<{ unarchived: boolean }> {
  const res = await fetch(`${BASE_URL}/events/${encodeURIComponent(eventId)}/unarchive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ unarchived: boolean }>;
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

export async function searchEventParticipants(
  eventId: string,
  params: { q: string; mode: ParticipantSearchMode }
): Promise<EventParticipant[]> {
  const query = new URLSearchParams({
    q: params.q,
    mode: params.mode,
  });
  return request<EventParticipant[]>(
    `/events/${encodeURIComponent(eventId)}/participants/search?${query.toString()}`
  );
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

export async function postTakeoutUndo(payload: TakeoutUndoPayload): Promise<TakeoutUndoResponse> {
  const res = await fetch(`${BASE_URL}/takeout/undo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<TakeoutUndoResponse>;
}

export async function putEventParticipant(
  eventId: string,
  participantId: string,
  payload: UpdateEventParticipantPayload
): Promise<EventParticipant> {
  const res = await fetch(
    `${BASE_URL}/events/${encodeURIComponent(eventId)}/participants/${encodeURIComponent(participantId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<EventParticipant>;
}

export async function getLegacyEventParticipants(eventId: string): Promise<LegacyEventParticipant[]> {
  return request<LegacyEventParticipant[]>(`/events/${encodeURIComponent(eventId)}/legacy-participants`);
}

export async function postLegacyTakeoutUndo(
  payload: LegacyTakeoutUndoPayload
): Promise<LegacyTakeoutUndoResponse> {
  const res = await fetch(`${BASE_URL}/takeout/undo/legacy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LegacyTakeoutUndoResponse>;
}

export async function getLegacyReservedNumbers(
  eventId: string,
  includeUsed = false
): Promise<LegacyReservedNumber[]> {
  const q = includeUsed ? "?includeUsed=true" : "";
  return request<LegacyReservedNumber[]>(
    `/events/${encodeURIComponent(eventId)}/legacy-reservations${q}`
  );
}

export async function postLegacyReserveNumbers(
  eventId: string,
  payload: LegacyReserveNumbersPayload
): Promise<LegacyReserveNumbersResponse> {
  const res = await fetch(
    `${BASE_URL}/events/${encodeURIComponent(eventId)}/legacy-reservations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LegacyReserveNumbersResponse>;
}

export async function postLegacyCreateParticipant(
  eventId: string,
  payload: CreateLegacyParticipantPayload
): Promise<LegacyEventParticipant> {
  const res = await fetch(
    `${BASE_URL}/events/${encodeURIComponent(eventId)}/legacy-participants`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LegacyEventParticipant>;
}

export async function searchLegacyEventParticipants(
  eventId: string,
  params: { q: string; mode: "numero" | "nome" | "cpf" | "birth_date" | "modality" }
): Promise<LegacyEventParticipant[]> {
  const query = new URLSearchParams({
    q: params.q,
    mode: params.mode,
  });
  return request<LegacyEventParticipant[]>(
    `/events/${encodeURIComponent(eventId)}/legacy-participants/search?${query.toString()}`
  );
}

export async function postLegacyTakeoutConfirm(
  payload: LegacyTakeoutConfirmPayload
): Promise<LegacyTakeoutConfirmResponse> {
  const res = await fetch(`${BASE_URL}/takeout/confirm/legacy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LegacyTakeoutConfirmResponse>;
}

export async function putLegacyEventParticipant(
  eventId: string,
  participantId: string,
  payload: UpdateLegacyParticipantPayload
): Promise<LegacyEventParticipant> {
  const res = await fetch(
    `${BASE_URL}/events/${encodeURIComponent(eventId)}/legacy-participants/${encodeURIComponent(participantId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LegacyEventParticipant>;
}

export function getTakeoutBaseUrl(): string {
  return BASE_URL;
}
