import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { EventSummary } from "@/components/event-summary";
import { ParticipantsTable } from "@/components/participants-table";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { cn } from "@/lib/utils";
import {
  getEventParticipants,
  getEvents,
  getLegacyEventParticipants,
  postLegacyTakeoutConfirm,
  postTakeoutConfirm,
  type EventParticipant,
  type LegacyEventParticipant,
} from "@/lib/takeout-api";
import { useTakeoutWs } from "@/lib/use-takeout-ws";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";

const isDev = import.meta.env.DEV;

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();

  useTakeoutWs(eventId);

  const { data: events = [] } = useQuery({
    queryKey: ["takeout", "events"],
    queryFn: () => getEvents(true),
  });
  const eventSummary = events.find((e) => e.eventId === eventId);
  const eventName = eventSummary?.name ?? eventId;

  const { data: participants = [], isLoading, refetch } = useQuery({
    queryKey: ["takeout", "events", eventId, "participants"],
    queryFn: async () => {
      if (eventSummary?.sourceType === "legacy_csv") {
        const rows = await getLegacyEventParticipants(eventId);
        return rows.map(mapLegacyToEventParticipant);
      }
      return getEventParticipants(eventId);
    },
    refetchInterval: 10_000,
  });

  const confirmMutation = useMutation({
    mutationFn: (p: EventParticipant) =>
      eventSummary?.sourceType === "legacy_csv"
        ? postLegacyTakeoutConfirm({
            request_id: crypto.randomUUID(),
            event_id: eventId,
            participant_id: p.id,
            device_id: "web-dashboard",
          })
        : postTakeoutConfirm({
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

  const confirmedCount = participants.filter((p) => p.checkinDone).length;
  const pendingCount = participants.length - confirmedCount;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/" },
          { label: eventName, href: `/events/${eventId}` },
          { label: "Participantes" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">{eventName}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label="Atualizar lista"
        >
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} aria-hidden />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando participantes...</p>
      ) : (
        <>
          <EventSummary
            totalParticipants={participants.length}
            confirmedCount={confirmedCount}
            pendingCount={pendingCount}
          />
          <ParticipantsTable
            eventName={eventName}
            participants={participants}
            onConfirm={(p) => confirmMutation.mutate(p)}
            isConfirming={confirmMutation.isPending}
            showQrColumn={isDev}
          />
        </>
      )}
    </main>
  );
}

export function mapLegacyToEventParticipant(legacy: LegacyEventParticipant): EventParticipant {
  return {
    id: legacy.id,
    name: legacy.name,
    cpf: legacy.cpf,
    birthDate: legacy.birthDate,
    ticketId: legacy.id,
    sourceTicketId: undefined,
    ticketName: legacy.modality ?? "Legado CSV",
    qrCode: legacy.id,
    checkinDone: legacy.checkinDone,
    customFormResponses: [
      { name: "sexo", label: "Sexo", type: "text", response: legacy.sex ?? "-" },
      { name: "camisa", label: "Tamanho da Camisa", type: "text", response: legacy.shirtSize ?? "-" },
      { name: "equipe", label: "Equipe", type: "text", response: legacy.team ?? "-" },
    ],
  };
}
