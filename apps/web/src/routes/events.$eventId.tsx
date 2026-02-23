import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getEventParticipants,
  postTakeoutConfirm,
  type EventParticipant,
} from "@/lib/takeout-api";
import { useTakeoutWs } from "@/lib/use-takeout-ws";
import { toast } from "sonner";

const isDev = import.meta.env.DEV;
const QR_SIZE = 160;

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();
  const [revealedId, setRevealedId] = useState<string | null>(null);
  useTakeoutWs(eventId);
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["takeout", "events", eventId, "participants"],
    queryFn: () => getEventParticipants(eventId),
    refetchInterval: 10_000,
  });

  const confirmMutation = useMutation({
    mutationFn: (p: EventParticipant) =>
      postTakeoutConfirm({
        request_id: crypto.randomUUID(),
        ticket_id: p.ticketId,
        device_id: "web-dashboard",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
      toast.success("Check-in confirmado");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao confirmar"),
  });

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">Evento — Participantes</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando participantes...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Ingresso</TableHead>
                {isDev && <TableHead>QR Code</TableHead>}
                <TableHead>Check-in</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name ?? "—"}</TableCell>
                  <TableCell>{p.cpf ?? "—"}</TableCell>
                  <TableCell>{p.sourceTicketId ?? p.ticketId}</TableCell>
                  {isDev && (
                    <TableCell>
                      {p.qrCode ? (
                        revealedId === p.id ? (
                          <button
                            type="button"
                            className="cursor-pointer border-0 bg-transparent p-0"
                            onClick={() => setRevealedId(null)}
                            title="Clique para ocultar"
                          >
                            <QRCodeSVG value={p.qrCode} size={QR_SIZE} level="M" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="flex min-h-[160px] min-w-[160px] cursor-pointer items-center justify-center rounded border border-dashed border-muted-foreground/40 bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50"
                            onClick={() => setRevealedId(p.id)}
                          >
                            Clique para mostrar
                          </button>
                        )
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  <TableCell>{p.checkinDone ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={p.checkinDone || confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate(p)}
                    >
                      {p.checkinDone ? "Confirmado" : "Confirmar check-in"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
