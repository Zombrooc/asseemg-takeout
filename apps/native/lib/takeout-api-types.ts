export type HealthResponse = { status: string };

export type ConnectionInfo = {
  baseUrl: string;
  pairingToken: string;
  expiresAt: string;
};

export type EventSummary = {
  eventId: string;
  name: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  importedAt: string;
};

export type CustomFormResponseItem = {
  name: string;
  label: string;
  type: string;
  response: unknown;
};

export type EventParticipant = {
  id: string;
  name: string | null;
  cpf: string | null;
  birthDate?: string | null;
  ticketId: string;
  ticketName?: string | null;
  qrCode: string;
  checkinDone: boolean;
  customFormResponses?: CustomFormResponseItem[];
};

export type TakeoutConfirmPayload = {
  request_id: string;
  ticket_id: string;
  device_id: string;
  payload_json?: string;
};

export type TakeoutConfirmResponse = { status: string };

export type TakeoutConfirmConflictResponse = {
  status: string;
  existing_request_id: string;
  ticket_id: string;
};

export type SyncEvent = {
  seq: number;
  eventId: string;
  type: string;
  payloadJson?: string | null;
  createdAt: number;
};

export type AuditEvent = {
  request_id: string;
  ticket_id: string;
  device_id: string;
  status: "CONFIRMED" | "DUPLICATE" | "FAILED";
  payload_json: string | null;
  created_at: string;
};
