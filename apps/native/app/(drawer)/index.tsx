import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";

import {
  ConnectionStatusCard,
  EventsList,
  StatusPill,
} from "@/components/mobile/home";
import { Button, Container, TopBar } from "@/components/ui";
import { ActivityIndicator, Text, View } from "@/lib/primitives";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable } from "@/lib/primitives";

export default function Home() {
  const router = useRouter();
  const {
    isPaired,
    isLoading: connectionLoading,
    isReachable,
    api,
    baseUrl,
    clearConnection,
    checkReachability,
  } = useTakeoutConnection();
  const eventsQuery = useQuery({
    queryKey: ["takeout-events"],
    queryFn: () =>
      api ? api.getEvents() : Promise.reject(new Error("No API")),
    enabled: !!api && isPaired && isReachable,
    refetchInterval: 15_000,
  });

  if (connectionLoading && !isPaired) {
    return (
      <Container
        className="flex-1 bg-background justify-center items-center"
        mode="static"
      >
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-3">Conectando...</Text>
      </Container>
    );
  }

  if (!isPaired) {
    return (
      <Container className="flex-1 bg-background" mode="static">
        <TopBar title="ASSEEMG Retira - Mobile" />
        <View className="flex-1 px-4 pt-4">
          <View className="border border-border rounded-2xl p-6 bg-card mb-6">
            <Text className="text-foreground font-semibold text-lg mb-2">
              Sem conexão com o desktop
            </Text>
            <Text className="text-muted-foreground text-sm mb-6">
              Conecte ao app Takeout Desktop na mesma rede local para iniciar.
            </Text>
            <Link href="/pair" asChild>
              <Button testID="home-pair-cta" className="w-full py-3">
                Parear com o Desktop
              </Button>
            </Link>
          </View>
          <Text className="text-muted-foreground text-sm">
            Escaneie o QR Code exibido no app desktop ou insira a URL
            manualmente.
          </Text>
        </View>
      </Container>
    );
  }

  const events = eventsQuery.data ?? [];
  const showEventsLoading = connectionLoading || eventsQuery.isLoading;

  return (
    <Container className="flex-1 bg-background" mode="static">
      <TopBar
        title="ASSEEMG Retira - Mobile"
        subtitle="Eventos disponíveis"
        actionSlot={
          <Pressable
            onPress={() => router.push("/audit")}
            className="p-1.5 rounded-lg active:opacity-70"
            accessibilityLabel="Abrir auditoria"
          >
            <Ionicons name="document-text-outline" size={22} color="#64748b" />
          </Pressable>
        }
        rightSlot={<StatusPill isReachable={isReachable} />}
      />
      <View className="flex-1 px-4 pt-2 pb-4 bg-background">
        <ConnectionStatusCard
          isReachable={isReachable}
          isConnecting={connectionLoading}
          baseUrl={baseUrl}
          onRetry={() => checkReachability()}
          onDisconnect={async () => {
            await clearConnection();
            router.replace("/pair");
          }}
        />

        <View className="flex-row items-baseline justify-between mt-2 mb-3 gap-2">
          <Text className="text-foreground font-semibold text-base leading-snug shrink">
            Eventos disponíveis
          </Text>
          <Text className="text-muted-foreground text-sm leading-snug shrink-0">
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </Text>
        </View>

        <EventsList
          isLoading={showEventsLoading}
          events={events}
          onOpenEvent={(eventId) => router.push(`/(drawer)/events/${eventId}`)}
          onPair={() => router.push("/pair")}
        />
      </View>
    </Container>
  );
}
