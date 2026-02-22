import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getHealth } from "@/lib/takeout-api";

export function ServerStatus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["takeout", "health"],
    queryFn: getHealth,
    refetchInterval: 10_000,
  });

  const ok = !isError && data?.status === "ok";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Servidor</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full shrink-0 ${ok ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-sm text-muted-foreground">
          {isLoading ? "Verificando..." : ok ? "Conectado" : "Desconectado"}
        </span>
      </CardContent>
    </Card>
  );
}
