import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Button, Card } from "@/components/ui-tamagui";

type Props = {
  isReachable: boolean;
  isConnecting?: boolean;
  baseUrl?: string | null;
  onRetry: () => void;
  onDisconnect?: () => void;
};

export function ConnectionStatusCard({
  isReachable,
  isConnecting = false,
  baseUrl,
  onRetry,
  onDisconnect,
}: Props) {
  const router = useRouter();

  if (isConnecting) {
    return (
      <Card style={{ marginBottom: 16, backgroundColor: "rgba(245,158,11,0.1)", borderColor: "#f59e0b" }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: "#f59e0b", flexShrink: 0 }} />
          <Text style={{ color: "#f59e0b", fontWeight: "500", fontSize: 14 }}>Conectando...</Text>
        </View>
        {baseUrl ? (
          <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }} numberOfLines={1} ellipsizeMode="middle">
            {baseUrl}
          </Text>
        ) : null}
      </Card>
    );
  }

  if (isReachable) {
    return (
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: "#10b981", flexShrink: 0 }} />
          <Text style={{ color: "#111827", fontWeight: "500", fontSize: 14 }}>Conectado ao desktop</Text>
        </View>
        {baseUrl ? (
          <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }} numberOfLines={1} ellipsizeMode="middle">
            {baseUrl}
          </Text>
        ) : null}
        {onDisconnect ? (
          <View style={{ marginTop: 12 }}>
            <Button testID="home-unpair" variant="bordered" onPress={onDisconnect}>
              Desparear
            </Button>
          </View>
        ) : null}
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 16 }}>
      <Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 4 }}>
        Sem conexão com o desktop
      </Text>
      <Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
        Conecte ao app Takeout Desktop na mesma rede local para iniciar.
      </Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button testID="connection-status-retry" onPress={onRetry}>
          Tentar novamente
        </Button>
        <Button testID="connection-status-reconnect" variant="bordered" onPress={() => router.push("/pair")}>
          Reconectar
        </Button>
      </View>
    </Card>
  );
}
