import type { EventParticipant, LegacyEventParticipant } from "@/lib/takeout-api-types";

export type TakeoutModalSourceType = "json_sync" | "legacy_csv";
export type TakeoutModalParticipant = EventParticipant | LegacyEventParticipant;

export type TakeoutModalParticipantDetails = {
  name: string;
  cpf: string;
  ticketType: string;
  shirtSize: string;
  bibNumber: string;
  ticketIdentifier: string;
  team: string;
};

function displayValue(value: string | number | null | undefined): string {
  if (value == null) return "-";
  const text = String(value).trim();
  return text || "-";
}

export function getTakeoutModalParticipantDetails(
  participant: TakeoutModalParticipant,
  sourceType: TakeoutModalSourceType,
): TakeoutModalParticipantDetails {
  const legacy = sourceType === "legacy_csv" ? (participant as LegacyEventParticipant) : null;
  const current = sourceType === "json_sync" ? (participant as EventParticipant) : null;

  return {
    name: displayValue(legacy?.name ?? current?.name),
    cpf: displayValue(legacy?.cpf ?? current?.cpf),
    ticketType: displayValue(legacy?.modality ?? current?.ticketName),
    shirtSize: displayValue(legacy?.shirtSize ?? current?.shirtSize),
    bibNumber: participant.bibNumber != null ? `#${participant.bibNumber}` : "Não atribuído",
    ticketIdentifier: displayValue(current?.sourceTicketId ?? current?.ticketId),
    team: displayValue(legacy?.team ?? current?.team),
  };
}
