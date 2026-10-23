import { z } from "zod";

export type HealthResponse = { status: string };

/** Versioned, authenticated LAN protocol. Credentials are sent only in connection.hello. */
export const syncCommandSchema = z.object({
  type: z.literal("command.execute"),
  protocolVersion: z.literal(1),
  operationId: z.string().uuid(),
  eventId: z.string().min(1),
  action: z.enum(["confirm_checkin", "undo_checkin"]),
  payload: z.object({ ticketId: z.string().min(1), payloadJson: z.string().max(20_000).optional() }),
});
export const syncHelloSchema = z.object({
  type: z.literal("connection.hello"), protocolVersion: z.literal(1), token: z.string().uuid(), deviceId: z.string().min(1).max(128),
});
export const syncSubscribeSchema = z.object({ type: z.literal("sync.subscribe"), eventId: z.string().min(1), lastSeq: z.number().int().nonnegative().default(0) });
export const syncClientMessageSchema = z.discriminatedUnion("type", [syncHelloSchema, syncSubscribeSchema, syncCommandSchema, z.object({ type: z.literal("connection.heartbeat") })]);
export type SyncClientMessage = z.infer<typeof syncClientMessageSchema>;
export type SyncCommand = z.infer<typeof syncCommandSchema>;

export type ConnectionInfo = {
  baseUrl: string;
  pairingToken: string;
  expiresAt: string;
};

export type NetworkAddress = {
  interfaceName: string;
  ip: string;
  url: string;
  isPrimary: boolean;
};

export type NetworkAddressesResponse = {
  baseUrl: string;
  port: number;
  addresses: NetworkAddress[];
};

export type EventSummary = {
  eventId: string;
  name: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  importedAt: string;
  sourceType?: "json_sync" | "legacy_csv" | "manual";
  archivedAt?: string | null;
};

export type CustomFormResponse = {
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
  sex?: string | null;
  shirtSize?: string | null;
  team?: string | null;
  ticketId: string;
  sourceTicketId?: string | null;
  ticketName?: string | null;
  qrCode: string;
  checkinDone: boolean;
  bibNumber?: number | null;
  customFormResponses?: CustomFormResponse[];
};

export type ParticipantSearchMode = "qr" | "ticket_id" | "cpf" | "nome" | "birth_date";

export type UpdateEventParticipantPayload = {
  name: string;
  cpf: string;
  birthDate: string;
  ticketType: string;
  shirtSize?: string | null;
  team?: string | null;
};

export type TakeoutConfirmPayload = {
  request_id: string;
  ticket_id: string;
  device_id: string;
  payload_json?: string;
};

export type TakeoutRetirantePayload = {
  retirada_por_terceiro: true;
  retirante_nome: string;
  retirante_cpf?: string;
};

export type TakeoutConfirmResponse = { status: string };

export type LegacyImportResponse = {
  imported: number;
  errors: string[];
};

export type LegacyReservedNumber = {
  eventId: string;
  bibNumber: number;
  label?: string | null;
  status: "available" | "used";
  createdAt: string;
  usedAt?: string | null;
  usedByParticipantId?: string | null;
};

export type LegacyReserveNumbersPayload = {
  numbers: { bibNumber: number; label?: string | null }[];
};

export type LegacyReserveNumbersResponse = {
  created: number;
  skipped: number;
  errors: string[];
};

export type LegacyEventParticipant = {
  id: string;
  bibNumber: number;
  name: string;
  sex?: string | null;
  cpf: string;
  cpfInconsistent?: boolean;
  birthDate: string;
  modality?: string | null;
  shirtSize?: string | null;
  team?: string | null;
  qrCode?: string | null;
  checkinDone: boolean;
};

export type LegacyTakeoutConfirmPayload = {
  request_id: string;
  event_id: string;
  participant_id: string;
  device_id: string;
  payload_json?: string;
};

export type CreateLegacyParticipantPayload = {
  reservationId: number;
  name: string;
  cpf: string;
  birthDate: string;
  ticketType: string;
  shirtSize?: string | null;
  team?: string | null;
  sex?: string | null;
};

export type LegacyTakeoutConfirmResponse = {
  status: "CONFIRMED" | "DUPLICATE";
};

export type TakeoutUndoPayload = {
  request_id: string;
  ticket_id: string;
  device_id: string;
  payload_json?: string;
};

export type TakeoutUndoResponse = {
  status: "REVERSED" | "DUPLICATE";
};

export type LegacyTakeoutUndoPayload = {
  request_id: string;
  event_id: string;
  participant_id: string;
  device_id: string;
  payload_json?: string;
};

export type LegacyTakeoutUndoResponse = {
  status: "REVERSED" | "DUPLICATE";
};

export type UpdateLegacyParticipantPayload = UpdateEventParticipantPayload;

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
  status: "CONFIRMED" | "DUPLICATE" | "FAILED" | "REVERSED";
  payload_json: string | null;
  created_at: string;
  source_type: "json_sync" | "legacy_csv";
  event_id: string | null;
  participant_id: string | null;
  participant_name: string | null;
  participant_cpf?: string | null;
  shirt_size?: string | null;
  birth_date: string | null;
  age_at_checkin: number | null;
  ticket_source_id: string | null;
  ticket_name: string | null;
  ticket_code: string | null;
  operator_alias: string | null;
  operator_device_id: string;
  checked_in_at: string;
};

export type WsTakeoutMessage =
  | { type: "connection.ready"; protocolVersion: number; deviceId: string }
  | { type: "connection.heartbeat"; sentAt: number }
  | { type: "sync.completed"; eventId: string; latestSeq: number }
  | {
      type: "participant_checked_in";
      ticket_id?: string;
      request_id?: string;
      participant_id?: string;
      device_id?: string;
      event_id?: string;
      source_type?: "json_sync" | "legacy_csv";
      seq?: number;
    }
  | {
      type: "participant_checkin_reverted";
      ticket_id?: string;
      request_id?: string;
      participant_id?: string;
      device_id?: string;
      event_id?: string;
      source_type?: "json_sync" | "legacy_csv";
      seq?: number;
    }
  | {
      type: "participant_updated";
      event_id?: string;
      participant_id: string;
      ticket_id?: string;
      source_type?: "json_sync" | "legacy_csv";
      participant?: EventParticipant | LegacyEventParticipant;
      name?: string | null;
      cpf?: string | null;
      birthDate?: string | null;
      ticketName?: string | null;
      modality?: string | null;
      shirtSize?: string | null;
      team?: string | null;
      seq?: number;
    }
  | {
      type: "lock_acquired";
      participant_id: string;
      device_id: string;
      event_id: string;
      expires_at: number;
      seq: number;
    }
  | {
      type: "lock_released";
      participant_id: string;
      device_id: string;
      event_id: string;
      expires_at?: number;
      seq: number;
    }
  | {
      type: "lock_renewed";
      participant_id: string;
      device_id: string;
      event_id: string;
      expires_at: number;
      seq: number;
    }
  | {
      type: "lock_snapshot";
      participant_id: string;
      device_id: string;
      event_id: string;
      expires_at: number;
      seq: number;
    }
  | {
      type: "events_list_changed";
      event_id?: "_events";
      seq?: number;
    }
  | {
      type: "heartbeat";
      sentAt: number;
    };
