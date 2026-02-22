import { createFileRoute } from "@tanstack/react-router";
import { NetworkAddresses } from "@/components/takeout/network-addresses";
import { PairingCard } from "@/components/takeout/pairing-card";
import { ServerStatus } from "@/components/takeout/server-status";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">Takeout — Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <ServerStatus />
        <NetworkAddresses />
      </div>
      <PairingCard />
    </div>
  );
}
