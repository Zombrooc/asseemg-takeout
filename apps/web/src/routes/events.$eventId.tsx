import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["takeout", "events", eventId, "participants"],
    queryFn: () => getEventParticipants(eventId),
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
                <TableHead>QR Code</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name ?? "—"}</TableCell>
                  <TableCell>{p.cpf ?? "—"}</TableCell>
                  <TableCell>{p.ticketId}</TableCell>
                  <TableCell className="font-mono text-xs">{p.qrCode}</TableCell>
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
