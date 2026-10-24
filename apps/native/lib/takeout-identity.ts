import type { EventParticipant, LegacyEventParticipant } from "@/lib/takeout-api-types";
import * as Crypto from "expo-crypto";

export type TakeoutSourceType = "json_sync" | "legacy_csv";
export type TakeoutParticipant = EventParticipant | LegacyEventParticipant;

const KEY_SEPARATOR = "\u001f";

export function isLegacyParticipant(
  participant: TakeoutParticipant,
): participant is LegacyEventParticipant {
  return typeof (participant as LegacyEventParticipant).bibNumber === "number";
}

/** The authoritative check-in entity is a ticket for JSON and a participant for legacy CSV. */
export function getTakeoutEntityId(
  participant: TakeoutParticipant,
  sourceType: TakeoutSourceType,
): string {
  if (sourceType === "legacy_csv") return participant.id;
  return (participant as EventParticipant).ticketId;
}

export function createParticipantEntityKey(
  eventId: string,
  sourceType: TakeoutSourceType,
  entityId: string,
): string {
  return [eventId, sourceType, entityId].join(KEY_SEPARATOR);
}

export function parseParticipantEntityKey(key: string): {
  eventId: string;
  sourceType: TakeoutSourceType;
  entityId: string;
} | null {
  const [eventId, sourceType, entityId, ...extra] = key.split(KEY_SEPARATOR);
  if (
    extra.length > 0 ||
    !eventId ||
    !entityId ||
    (sourceType !== "json_sync" && sourceType !== "legacy_csv")
  ) return null;
  return { eventId, sourceType, entityId };
}

export function participantEntityKey(
  eventId: string,
  sourceType: TakeoutSourceType,
  participant: TakeoutParticipant,
): string {
  return createParticipantEntityKey(
    eventId,
    sourceType,
    getTakeoutEntityId(participant, sourceType),
  );
}

export function secureOperationId(): string {
  return Crypto.randomUUID();
}
