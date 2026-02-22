import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EventSummary } from "@/lib/takeout-api";

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

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
          {formatDate(event.startDate)}
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
