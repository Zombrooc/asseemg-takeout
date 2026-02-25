import { useRouter } from "expo-router";

import { Button, Card } from "@/components/ui";
import { Text, View } from "@/lib/primitives";

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
      <Card className="mb-4 border border-border rounded-2xl p-4 bg-warning/10 overflow-hidden">
        <View className="flex-row items-center flex-wrap gap-2">
          <View className="w-2.5 h-2.5 rounded-full bg-warning shrink-0" />
          <Text className="text-warning font-medium text-sm leading-snug">
            Conectando...
          </Text>
        </View>
        {baseUrl ? (
          <Text
            className="text-muted-foreground text-xs mt-2 leading-tight"
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {baseUrl}
          </Text>
        ) : null}
      </Card>
    );
  }

  if (isReachable) {
    return (
      <Card className="mb-4 border border-border rounded-2xl p-4 bg-card overflow-hidden">
        <View className="flex-row items-center flex-wrap gap-2">
          <View className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
          <Text className="text-foreground font-medium text-sm leading-snug">
            Conectado ao desktop
          </Text>
        </View>
        {baseUrl ? (
          <Text
            className="text-muted-foreground text-xs mt-2 leading-tight"
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {baseUrl}
          </Text>
        ) : null}
        {onDisconnect ? (
          <Button
            testID="home-unpair"
            size="sm"
            variant="bordered"
            className="mt-3 rounded-xl min-h-[40px] px-4 py-2"
            onPress={onDisconnect}
          >
            Desparear
          </Button>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="mb-4 border border-border rounded-2xl p-4 bg-card overflow-hidden">
      <Text className="text-foreground font-medium text-sm leading-snug mb-1">
        Sem conexão com o desktop
      </Text>
      <Text className="text-muted-foreground text-sm leading-relaxed mb-4">
        Conecte ao app Takeout Desktop na mesma rede local para iniciar.
      </Text>
      <View className="flex-row gap-2 flex-wrap">
        <Button
          testID="connection-status-retry"
          size="sm"
          className="px-4 py-2 rounded-xl min-h-[40px]"
          onPress={onRetry}
        >
          Tentar novamente
        </Button>
        <Button
          testID="connection-status-reconnect"
          size="sm"
          variant="bordered"
          className="px-4 py-2 rounded-xl min-h-[40px]"
          onPress={() => router.push("/pair")}
        >
          Reconectar
        </Button>
      </View>
    </Card>
  );
}
