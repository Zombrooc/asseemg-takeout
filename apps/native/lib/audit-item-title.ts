import type { AuditEvent } from "@/lib/takeout-api-types";

export function getAuditItemTitle(item: AuditEvent): string {
  return item.participant_name?.trim() || item.ticket_id;
}

