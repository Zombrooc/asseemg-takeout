import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Archive, MoreVertical, Users } from "lucide-react";
import type { ReactNode } from "react";

export interface EventCardProps {
  eventId: string;
  name: string;
  date: string;
  participantCount: number;
  icon?: ReactNode;
  archived?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
}

export function EventCard({
  eventId,
  name,
  date,
  participantCount,
  icon,
  archived = false,
  onArchive,
  onUnarchive,
  onDelete,
}: EventCardProps) {
  return (
    <Card className={cn(archived && "opacity-60")}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {icon != null ? (
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-lg">
              {icon}
            </span>
          ) : (
            <Users className="size-10 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div>
            <CardTitle className="text-base font-semibold">{name}</CardTitle>
            {archived && (
              <span className="text-xs text-muted-foreground">Arquivado</span>
            )}
          </div>
        </div>
        {(onArchive != null || onUnarchive != null || onDelete != null) && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" aria-label="Ações do evento">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!archived && onArchive != null && (
                <DropdownMenuItem onClick={onArchive}>Arquivar</DropdownMenuItem>
              )}
              {archived && onUnarchive != null && (
                <DropdownMenuItem onClick={onUnarchive}>Restaurar</DropdownMenuItem>
              )}
              {onDelete != null && (
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  Apagar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{date}</p>
        <p className="text-sm text-muted-foreground">
          {participantCount} participante{participantCount !== 1 ? "s" : ""}
        </p>
        {!archived ? (
          <Link
            to="/events/$eventId"
            params={{ eventId }}
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "w-full")}
          >
            Ver Participantes
          </Link>
        ) : (
          onUnarchive != null && (
            <Button variant="outline" size="sm" className="w-full" onClick={onUnarchive}>
              Restaurar
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
