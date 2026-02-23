import { Link } from "@tanstack/react-router";
import { MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/format-date";
import type { EventSummary } from "@/lib/takeout-api";

type EventCardProps = {
  event: EventSummary;
  onArchive?: (event: EventSummary) => void | Promise<void>;
  onUnarchive?: (event: EventSummary) => void | Promise<void>;
  onDelete?: (event: EventSummary) => void | Promise<void>;
};

export function EventCard({ event, onArchive, onUnarchive, onDelete }: EventCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base">{event.name ?? event.eventId}</CardTitle>
        {(onArchive != null || onUnarchive != null || onDelete != null) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded p-1 hover:bg-muted"
              aria-label="Ações do evento"
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onArchive != null && (
                <DropdownMenuItem onClick={() => onArchive(event)}>
                  Arquivar
                </DropdownMenuItem>
              )}
              {onUnarchive != null && (
                <DropdownMenuItem onClick={() => onUnarchive(event)}>
                  Desarquivar
                </DropdownMenuItem>
              )}
              {onDelete != null && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(event)}
                >
                  Apagar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
