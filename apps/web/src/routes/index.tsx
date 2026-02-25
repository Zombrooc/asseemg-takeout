import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EventCard } from "@/components/event-card";
import { PairingSection } from "@/components/pairing-section";
import { StatusCard } from "@/components/status-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getConnectionInfo,
  getEvents,
  getHealth,
  getNetworkAddresses,
  postEventArchive,
  postEventUnarchive,
  deleteEvent,
  renewPairingToken,
  type EventSummary,
} from "@/lib/takeout-api";
import { formatDateBR } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { ChevronDown, Plus, Server, Wifi } from "lucide-react";

function pairingUrl(baseUrl: string, token: string): string {
  const u = new URL(baseUrl);
  u.searchParams.set("token", token);
  return u.toString();
}

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

  const { data: health } = useQuery({
    queryKey: ["takeout", "health"],
    queryFn: getHealth,
    refetchInterval: 10_000,
  });

  const { data: networkAddresses } = useQuery({
    queryKey: ["takeout", "network-addresses"],
    queryFn: getNetworkAddresses,
    refetchInterval: 30_000,
  });

  const { data: connectionInfo, isLoading: connectionLoading } = useQuery({
    queryKey: ["takeout", "connectionInfo"],
    queryFn: getConnectionInfo,
  });

  const renewMutation = useMutation({
    mutationFn: renewPairingToken,
    onSuccess: (info) => {
      queryClient.setQueryData(["takeout", "connectionInfo"], info);
      toast.success("Token renovado");
    },
    onError: () => toast.error("Falha ao renovar token"),
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
    if (!window.confirm(`Apagar o evento "${name}" e todos os participantes?`))
      return;
    try {
      await deleteEvent(event.eventId);
      queryClient.invalidateQueries({ queryKey: ["takeout", "events"] });
      toast.success("Evento apagado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao apagar");
    }
  };

  const serverOk = health?.status === "ok";
  const primaryAddress =
    networkAddresses?.addresses?.find((a) => a.isPrimary)?.url ??
    networkAddresses?.baseUrl ??
    "—";

  const pairingUrlValue =
    connectionInfo != null
      ? pairingUrl(connectionInfo.baseUrl, connectionInfo.pairingToken)
      : "";

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg bg-muted/30 p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-semibold">Status do Sistema</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <StatusCard
            title="Servidor"
            status={serverOk ? "connected" : "disconnected"}
            value={serverOk ? "127.0.0.1:5555" : "Desconectado"}
            description="API Axum ativa"
            icon={
              <Server className="size-6 text-muted-foreground" aria-hidden />
            }
          />
          <StatusCard
            title="Rede"
            status={serverOk ? "connected" : "pending"}
            value={primaryAddress}
            description="Endereço para pareamento"
            icon={<Wifi className="size-6 text-muted-foreground" aria-hidden />}
          />
        </div>
      </section>

      <section className="rounded-lg bg-muted/30 p-4 sm:p-6">
        {connectionLoading || !connectionInfo ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <PairingSection
            pairingUrl={pairingUrlValue}
            onRenewToken={() => renewMutation.mutate()}
            isRenewing={renewMutation.isPending}
          />
        )}
      </section>

      {(isLoading || events.length > 0) && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Eventos Importados</h2>
            <Link
              to="/import"
              className={cn(
                buttonVariants({ size: "sm" }),
                "inline-flex items-center gap-1.5",
              )}
            >
              <Plus className="size-4" aria-hidden />
              Novo Evento
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Carregando eventos...
              </p>
            ) : (
              activeEvents.map((event) => (
                <EventCard
                  key={event.eventId}
                  eventId={event.eventId}
                  name={event.name ?? event.eventId}
                  date={
                    event.startTime
                      ? `${event.startTime} · ${formatDateBR(event.startDate)}`
                      : formatDateBR(event.startDate)
                  }
                  participantCount={0}
                  archived={false}
                  onArchive={() => handleArchive(event)}
                  onDelete={() => handleDelete(event)}
                />
              ))
            )}
          </div>

          {!isLoading && archivedEvents.length > 0 && (
            <Collapsible className="mt-8">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left font-medium hover:bg-muted/50">
                Arquivo
                <ChevronDown
                  className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180"
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedEvents.map((event) => (
                    <EventCard
                      key={event.eventId}
                      eventId={event.eventId}
                      name={event.name ?? event.eventId}
                      date={
                        event.startTime
                          ? `${event.startTime} · ${formatDateBR(event.startDate)}`
                          : formatDateBR(event.startDate)
                      }
                      participantCount={0}
                      archived
                      onUnarchive={() => handleUnarchive(event)}
                      onDelete={() => handleDelete(event)}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </section>
      )}
    </main>
  );
}
