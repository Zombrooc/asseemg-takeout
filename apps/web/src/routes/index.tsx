import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EventCard } from "@/components/takeout/event-card";
import { NetworkAddresses } from "@/components/takeout/network-addresses";
import { PairingCard } from "@/components/takeout/pairing-card";
import { ServerStatus } from "@/components/takeout/server-status";
import { getEvents } from "@/lib/takeout-api";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["takeout", "events"],
    queryFn: getEvents,
  });

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
              events.map((event) => <EventCard key={event.eventId} event={event} />)
            )}
          </div>
        </div>
      )}
      <PairingCard />
    </div>
  );
}
