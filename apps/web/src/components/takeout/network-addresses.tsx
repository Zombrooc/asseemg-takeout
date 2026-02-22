import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTakeoutBaseUrl } from "@/lib/takeout-api";

/** Mock: IPs virão do server (GET /network) ou Tauri. Fallback: exibe apenas porta. */
const MOCK_IPS = ["192.168.1.100", "10.0.0.2"];

export function NetworkAddresses() {
  const baseUrl = getTakeoutBaseUrl();
  const port = baseUrl.match(/:(\d+)/)?.[1] ?? "5555";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Endereços de rede</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Conecte o app mobile na mesma rede usando um dos endereços:
        </p>
        <ul className="list-inside list-disc text-sm font-mono">
          {MOCK_IPS.map((ip) => (
            <li key={ip}>
              http://{ip}:{port}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
