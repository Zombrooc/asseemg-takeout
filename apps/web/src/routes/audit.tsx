import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "@/components/takeout/audit-page";

type AuditSearch = {
  eventId?: string;
};

export const Route = createFileRoute("/audit")({
  validateSearch: (search): AuditSearch => ({
    eventId:
      typeof search.eventId === "string" && search.eventId.trim().length > 0
        ? search.eventId
        : undefined,
  }),
  component: AuditRoute,
});

function AuditRoute() {
  const { eventId } = Route.useSearch();
  return <AuditPage initialEventId={eventId} />;
}
