import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { Pressable } from "react-native";

import {
  ConnectionStatusCard,
  EventsList,
  StatusPill,
} from "@/components/mobile-tamagui/home";
import { Button, ScreenContainer, Spinner, TopBar } from "@/components/ui-tamagui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable as RNPressable, Text, View } from "react-native";

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
      <ScreenContainer mode="static">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Spinner size="large" />
          <Text style={{ color: "#6b7280", marginTop: 12 }}>Conectando...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!isPaired) {
    return (
      <ScreenContainer mode="static">
        <TopBar title="ASSEEMG Retira - Mobile" />
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 16,
              padding: 24,
              backgroundColor: "#f9fafb",
              marginBottom: 24,
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "600", fontSize: 18, marginBottom: 8 }}>
              Sem conexão com o desktop
            </Text>
            <Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
              Conecte ao app Takeout Desktop na mesma rede local para iniciar.
            </Text>
            <Link href="/pair" asChild>
              <Button testID="home-pair-cta" width="100%">
                Parear com o Desktop
              </Button>
            </Link>
          </View>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>
            Escaneie o QR Code exibido no app desktop ou insira a URL manualmente.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const events = eventsQuery.data ?? [];
  const showEventsLoading = connectionLoading || eventsQuery.isLoading;

  return (
    <ScreenContainer mode="static">
      <TopBar
        title="ASSEEMG Retira - Mobile"
        subtitle="Eventos disponíveis"
        actionSlot={
          <RNPressable
            onPress={() => router.push("/audit")}
            style={({ pressed }) => ({ padding: 6, borderRadius: 8, opacity: pressed ? 0.7 : 1 })}
            accessibilityLabel="Abrir auditoria"
          >
            <Ionicons name="document-text-outline" size={22} color="#64748b" />
          </RNPressable>
        }
        rightSlot={<StatusPill isReachable={isReachable} />}
      />
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: "#ffffff" }}>
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

        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 8, marginBottom: 12, gap: 8 }}>
          <Text style={{ color: "#111827", fontWeight: "600", fontSize: 16, flexShrink: 1 }}>
            Eventos disponíveis
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 14, flexShrink: 0 }}>
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
    </ScreenContainer>
  );
}
