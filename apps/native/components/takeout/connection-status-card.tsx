import { Button, Surface } from "heroui-native";

import { Text, View } from "@/lib/primitives";

type Props = {
  isReachable: boolean;
  onRetry: () => void;
  onReconnect: () => void;
};

export function ConnectionStatusCard({ isReachable, onRetry, onReconnect }: Props) {
  if (isReachable) {
    return (
      <Surface variant="tertiary" className="p-3 rounded-2xl">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full mr-3 bg-success" />
          <Text className="text-muted-foreground text-sm">Conectado ao desktop</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface variant="tertiary" className="p-3 rounded-2xl mb-3">
      <Text className="text-foreground text-sm mb-3">
        Desktop desconectado. Conecte-se para sincronizar dados.
      </Text>
      <View className="flex-row gap-2">
        <Button testID="cta-conectar" size="sm" className="px-3 py-2" onPress={onRetry}>
          Tentar novamente
        </Button>
        <Button size="sm" variant="bordered" className="px-3 py-2" onPress={onReconnect}>
          Reconectar
        </Button>
      </View>
    </Surface>
  );
}
