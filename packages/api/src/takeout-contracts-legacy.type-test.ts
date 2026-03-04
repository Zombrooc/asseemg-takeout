import type {
  EventSummary,
  LegacyEventParticipant,
  LegacyImportResponse,
  LegacyTakeoutConfirmPayload,
  LegacyTakeoutConfirmResponse,
} from "./takeout-contracts";

const eventSummaryLegacy: EventSummary = {
  eventId: "ev-legacy",
  name: "Evento",
  startDate: "2026-05-15",
  endDate: null,
  startTime: null,
  importedAt: "2026-05-15T10:00:00Z",
  sourceType: "legacy_csv",
};

const participantLegacy: LegacyEventParticipant = {
  id: "legacy-1",
  bibNumber: 1,
  name: "Thiago Lima Araujo",
  sex: "Masculino",
  cpf: "17979086937",
  birthDate: "2000-03-08",
  modality: "5KM",
  shirtSize: "EXG",
  team: null,
  checkinDone: false,
};

const importResponseLegacy: LegacyImportResponse = {
  imported: 1,
  errors: [],
};

const confirmPayloadLegacy: LegacyTakeoutConfirmPayload = {
  request_id: "abc",
  event_id: "ev-legacy",
  participant_id: participantLegacy.id,
  device_id: "dev-1",
};

const confirmResponseLegacy: LegacyTakeoutConfirmResponse = {
  status: "CONFIRMED",
};

void eventSummaryLegacy;
void participantLegacy;
void importResponseLegacy;
void confirmPayloadLegacy;
void confirmResponseLegacy;
