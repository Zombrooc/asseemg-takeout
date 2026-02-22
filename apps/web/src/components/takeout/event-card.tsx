import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/format-date";
import type { EventSummary } from "@/lib/takeout-api";

type EventCardProps = { event: EventSummary };

export function EventCard({ event }: EventCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{event.name ?? event.eventId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {event.startTime ? `${event.startTime} · ` : ""}
          {formatDateBR(event.startDate)}
        </p>
        <Link
          to="/events/$eventId"
          params={{ eventId: event.eventId }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Ver participantes
        </Link>
      </CardContent>
    </Card>
  );
}
