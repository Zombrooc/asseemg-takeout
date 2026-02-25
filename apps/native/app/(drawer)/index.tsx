import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";

import {
  ConnectionStatusCard,
  EventsList,
  StatusPill,
} from "@/components/mobile/home";
import { Button, Container, Divider } from "@/components/ui";
import { ActivityIndicator, Text, View } from "@/lib/primitives";

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
    queryFn: () =>
      api ? api.getEvents() : Promise.reject(new Error("No API")),
    enabled: !!api && isPaired && isReachable,
    refetchInterval: 15_000,
  });

  if (connectionLoading) {
    return (
      <Container className="px-4 justify-center items-center" mode="static">
        <ActivityIndicator size="large" />
      </Container>
    );
  }

  if (!isPaired) {
    return (
      <Container className="px-4 py-6" contentClassName="flex-1">
        <Text className="text-2xl font-semibold text-foreground mb-2">
          ASSEEMG Retira - Mobile
        </Text>
        <Text className="text-muted-foreground mb-6">
          Conecte ao app desktop na mesma rede para ver eventos e registrar
          retiradas.
        </Text>
        <Link href="/pair" asChild>
          <Button testID="home-pair-cta" className="px-4 py-3">Parear com o Desktop</Button>
        </Link>
      </Container>
    );
  }

  const events = eventsQuery.data ?? [];

  return (
    <Container className="px-4 pb-4" contentClassName="flex-1">
      <View className="py-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-semibold text-foreground">Eventos</Text>
          <StatusPill isReachable={isReachable} />
        </View>
        <ConnectionStatusCard
          isReachable={isReachable}
          onRetry={() => checkReachability()}
        />
      </View>

      <Divider className="mb-4" />

      <EventsList
        isLoading={eventsQuery.isLoading}
        events={events}
        onOpenEvent={(eventId) => router.push(`/(drawer)/events/${eventId}`)}
      />

      <View className="mt-8 pt-4">
        <Button
          testID="home-unpair"
          variant="bordered"
          className="px-4 py-3"
          onPress={async () => {
            await clearConnection();
            router.replace("/pair");
          }}
        >
          Desparear
        </Button>
      </View>
    </Container>
  );
}
