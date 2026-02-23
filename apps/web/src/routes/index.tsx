import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EventCard } from "@/components/takeout/event-card";
import { NetworkAddresses } from "@/components/takeout/network-addresses";
import { PairingCard } from "@/components/takeout/pairing-card";
import { ServerStatus } from "@/components/takeout/server-status";
import {
  deleteEvent,
  getEvents,
  postEventArchive,
  postEventUnarchive,
  type EventSummary,
} from "@/lib/takeout-api";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["takeout", "events"],
    queryFn: () => getEvents(true),
    refetchInterval: 15_000,
  });

  const activeEvents = events.filter((e) => !e.archivedAt);
  const archivedEvents = events.filter((e) => e.archivedAt);

  const handleArchive = async (event: EventSummary) => {
    try {
      await postEventArchive(event.eventId);
      queryClient.invalidateQueries({ queryKey: ["takeout", "events"] });
      toast.success("Evento arquivado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao arquivar");
    }
  };

  const handleUnarchive = async (event: EventSummary) => {
    try {
      await postEventUnarchive(event.eventId);
      queryClient.invalidateQueries({ queryKey: ["takeout", "events"] });
      toast.success("Evento desarquivado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desarquivar");
    }
  };

  const handleDelete = async (event: EventSummary) => {
    const name = event.name ?? event.eventId;
    if (!window.confirm(`Apagar o evento "${name}" e todos os participantes?`)) return;
    try {
      await deleteEvent(event.eventId);
      queryClient.invalidateQueries({ queryKey: ["takeout", "events"] });
      toast.success("Evento apagado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao apagar");
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">Takeout — Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <ServerStatus />
        <NetworkAddresses />
      </div>
      {(isLoading || events.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-medium">Eventos importados</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando eventos...</p>
            ) : (
              activeEvents.map((event) => (
                <EventCard
                  key={event.eventId}
                  event={event}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
          {!isLoading && archivedEvents.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-medium text-muted-foreground">Eventos arquivados</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archivedEvents.map((event) => (
                  <EventCard
                    key={event.eventId}
                    event={event}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <PairingCard />
    </div>
  );
}
