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

export async function postImport(file: File): Promise<{ imported: number; errors: string[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/admin/import`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ imported: number; errors: string[] }>;
}

export function getTakeoutBaseUrl(): string {
  return BASE_URL;
}
