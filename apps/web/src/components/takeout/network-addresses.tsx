import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getNetworkAddresses, getTakeoutBaseUrl } from "@/lib/takeout-api";

export function NetworkAddresses() {
  const fallbackBaseUrl = getTakeoutBaseUrl();
  const { data, isLoading } = useQuery({
    queryKey: ["takeout", "network-addresses"],
    queryFn: getNetworkAddresses,
    refetchInterval: 30_000,
  });

  const addresses = data?.addresses ?? [];
  const fallbackAddress = data?.baseUrl ?? fallbackBaseUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enderecos de rede</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Conecte o app mobile na mesma rede usando um dos enderecos:
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : addresses.length > 0 ? (
          <ul className="list-inside list-disc text-sm font-mono">
            {addresses.map((address) => (
              <li key={address.url}>
                {address.url}
                {address.isPrimary ? " (principal)" : ""}
                <span className="text-muted-foreground"> - {address.interfaceName}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-mono">{fallbackAddress}</p>
        )}
      </CardContent>
    </Card>
  );
}
