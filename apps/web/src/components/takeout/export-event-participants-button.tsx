import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportEventParticipantsFile,
  type EventSourceType,
  type ExportFormat,
} from "@/lib/event-participants-export";
import type { EventParticipant } from "@/lib/takeout-api";
import { toast } from "sonner";

type ExportEventParticipantsButtonProps = {
  eventId: string;
  eventName: string;
  participants: EventParticipant[];
  sourceType: EventSourceType;
  disabled?: boolean;
};

export function ExportEventParticipantsButton({
  eventId,
  eventName,
  participants,
  sourceType,
  disabled = false,
}: ExportEventParticipantsButtonProps) {
  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) =>
      exportEventParticipantsFile({
        eventId,
        eventName,
        participants,
        sourceType,
        format,
      }),
    onSuccess: (result, format) => {
      if (result.status === "cancelled") return;
      if (result.status === "saved") {
        toast.success(`Arquivo ${format.toUpperCase()} salvo (${result.count} participante(s)).`);
        return;
      }
      toast.success(`Download ${format.toUpperCase()} iniciado (${result.count} participante(s)).`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao exportar participantes."),
  });

  const handleExport = (format: ExportFormat) => {
    if (participants.length === 0) {
      toast.error("Nenhum participante para exportar.");
      return;
    }
    exportMutation.mutate(format);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={disabled || exportMutation.isPending} />
        }
        aria-label="Exportar"
      >
        <Download className="size-4" aria-hidden />
        {exportMutation.isPending ? "Exportando..." : "Exportar"}
        <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>Exportar CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>Exportar JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
