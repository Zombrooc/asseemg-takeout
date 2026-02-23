import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, useRouter } from "expo-router";
import { Button, Chip, Separator, Spinner, Surface, useThemeColor } from "heroui-native";

import { Container } from "@/components/container";
import { ActivityIndicator, Pressable, Text, View } from "@/lib/primitives";
import { formatDateBR } from "@/lib/format-date";

export default function Home() {
  const router = useRouter();
  const {
    isPaired,
    isLoading: connectionLoading,
    isReachable,
    api,
    clearConnection,
    checkReachability,
  } = useTakeoutConnection();
  const eventsQuery = useQuery({
    queryKey: ["takeout-events"],
    queryFn: () => (api ? api.getEvents() : Promise.reject(new Error("No API"))),
    enabled: !!api && isPaired && isReachable,
    refetchInterval: 15_000,
  });

  const successColor = useThemeColor("success");
  const dangerColor = useThemeColor("danger");

  if (connectionLoading) {
    return (
      <Container className="px-4 justify-center items-center">
        <ActivityIndicator size="large" />
      </Container>
    );
  }

  if (!isPaired) {
    return (
      <Container className="px-4 py-6">
        <Text className="text-2xl font-semibold text-foreground mb-2">ASSEEMG Retira - Mobile</Text>
        <Text className="text-muted-foreground mb-6">
          Conecte ao app desktop na mesma rede para ver eventos e registrar retiradas.
        </Text>
        <Link href="/pair" asChild>
          <Button>Parear com o Desktop</Button>
        </Link>
      </Container>
    );
  }

  const events = eventsQuery.data ?? [];

  return (
    <Container className="px-4 pb-4">
      <View className="py-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-semibold text-foreground">Eventos</Text>
          <Chip variant="secondary" color={isReachable ? "success" : "danger"} size="sm">
            <Chip.Label>{isReachable ? "LIVE" : "OFFLINE"}</Chip.Label>
          </Chip>
        </View>
        {!isReachable ? (
          <Surface variant="tertiary" className="p-3 rounded-lg mb-3">
            <Text className="text-foreground text-sm mb-3">Desktop desconectado. Conecte-se para sincronizar dados.</Text>
            <View className="flex-row gap-2">
              <Button size="sm" onPress={() => checkReachability()}>
                Tentar novamente
              </Button>
              <Button size="sm" variant="bordered" onPress={() => router.push("/pair")}>
                Reconectar
              </Button>
            </View>
          </Surface>
        ) : (
          <Surface variant="tertiary" className="p-3 rounded-lg">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full mr-3 bg-success" />
              <Text className="text-muted-foreground text-sm">Conectado ao desktop</Text>
            </View>
          </Surface>
        )}
      </View>

      <Separator className="mb-4" />

      {eventsQuery.isLoading ? (
        <View className="py-8 items-center">
          <Spinner size="lg" />
        </View>
      ) : events.length === 0 ? (
        <Text className="text-muted-foreground py-6">
          Nenhum evento importado. Importe eventos no app desktop para listá-los aqui.
        </Text>
      ) : (
        <View className="gap-3">
          {events.map((ev) => (
            <Pressable
              key={ev.eventId}
              onPress={() => router.push(`/(drawer)/events/${ev.eventId}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Surface variant="secondary" className="p-4 rounded-xl">
                <Text className="text-foreground font-medium">{ev.name ?? ev.eventId}</Text>
                {ev.startDate ? (
                  <Text className="text-muted-foreground text-sm mt-1">{formatDateBR(ev.startDate)}</Text>
                ) : null}
              </Surface>
            </Pressable>
          ))}
        </View>
      )}

      <View className="mt-8 pt-4">
        <Button variant="bordered" onPress={async () => { await clearConnection(); router.replace("/pair"); }}>
          Desparear
        </Button>
      </View>
    </Container>
  );
}
