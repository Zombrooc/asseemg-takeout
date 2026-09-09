import type {
	AuditEvent,
	ConnectionInfo,
	EventParticipant,
	EventSummary,
	LegacyEventParticipant,
	NetworkAddressesResponse,
	ParticipantSearchMode,
} from "@pickup/api/takeout-contracts";

export type {
	AuditEvent,
	ConnectionInfo,
	EventParticipant,
	EventSummary,
	LegacyEventParticipant,
	NetworkAddressesResponse,
};

const BASE_URL = "http://127.0.0.1:5555";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${BASE_URL}${path}`, {
		...init,
		headers: { "Content-Type": "application/json", ...init?.headers },
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(body?.error ?? `HTTP ${response.status}`);
	}
	return response.json() as Promise<T>;
}

export const api = {
	health: () => request<{ status: string }>("/health"),
	network: () => request<NetworkAddressesResponse>("/network/addresses"),
	connection: () => request<ConnectionInfo>("/pair/info"),
	renewPairing: () =>
		request<ConnectionInfo>("/pair/renew", { method: "POST" }),
	events: () => request<EventSummary[]>("/events?includeArchived=true"),
	participants: (eventId: string) =>
		request<EventParticipant[]>(
			`/events/${encodeURIComponent(eventId)}/participants`,
		),
	searchParticipants: (
		eventId: string,
		q: string,
		mode: ParticipantSearchMode,
	) =>
		request<EventParticipant[]>(
			`/events/${encodeURIComponent(eventId)}/participants/search?${new URLSearchParams({ q, mode })}`,
		),
	legacyParticipants: (eventId: string) =>
		request<LegacyEventParticipant[]>(
			`/events/${encodeURIComponent(eventId)}/legacy-participants`,
		),
	confirm: (payload: Record<string, unknown>) =>
		request<{ status: string }>("/takeout/confirm", {
			method: "POST",
			body: JSON.stringify(payload),
		}),
	undo: (payload: Record<string, unknown>) =>
		request<{ status: string }>("/takeout/undo", {
			method: "POST",
			body: JSON.stringify(payload),
		}),
	legacyConfirm: (payload: Record<string, unknown>) =>
		request<{ status: string }>("/takeout/confirm/legacy", {
			method: "POST",
			body: JSON.stringify(payload),
		}),
	legacyUndo: (payload: Record<string, unknown>) =>
		request<{ status: string }>("/takeout/undo/legacy", {
			method: "POST",
			body: JSON.stringify(payload),
		}),
	archive: (eventId: string) =>
		request<{ archived: boolean }>(
			`/events/${encodeURIComponent(eventId)}/archive`,
			{ method: "POST" },
		),
	unarchive: (eventId: string) =>
		request<{ unarchived: boolean }>(
			`/events/${encodeURIComponent(eventId)}/unarchive`,
			{ method: "POST" },
		),
	removeEvent: (eventId: string) =>
		request<{ deleted: boolean }>(`/events/${encodeURIComponent(eventId)}`, {
			method: "DELETE",
		}),
	audit: (eventId: string, status?: string) =>
		request<AuditEvent[]>(
			`/audit?${new URLSearchParams({ eventId, ...(status ? { status } : {}) })}`,
		),
	importJson: (payload: unknown) =>
		request<unknown>("/sync/import", {
			method: "POST",
			body: JSON.stringify(payload),
		}),
	importCsv: (fields: {
		eventName: string;
		eventStartDate: string;
		file: File;
		eventId?: string;
	}) => {
		const form = new FormData();
		form.append("eventName", fields.eventName);
		form.append("eventStartDate", fields.eventStartDate);
		if (fields.eventId) form.append("eventId", fields.eventId);
		form.append("file", fields.file);
		return request<{ imported: number; errors: string[] }>(
			"/admin/import/legacy-csv",
			{ method: "POST", body: form, headers: {} },
		);
	},
};

export const wsUrl = (eventId: string) =>
	`ws://127.0.0.1:5555/ws?${new URLSearchParams({ event_id: eventId, device_id: "desktop" })}`;
