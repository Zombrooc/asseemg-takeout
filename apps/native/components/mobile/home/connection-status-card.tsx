import { useRouter } from "expo-router";

import { Banner, Button } from "@/components/ui";
import { Text, View } from "@/lib/primitives";

type Props = {
  isReachable: boolean;
  onRetry: () => void;
};

export function ConnectionStatusCard({ isReachable, onRetry }: Props) {
  const router = useRouter();

  if (isReachable) {
    return (
      <Banner>
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full mr-3 bg-success" />
          <Text className="text-muted-foreground text-sm">Conectado ao desktop</Text>
        </View>
      </Banner>
    );
  }

  return (
    <Banner className="mb-3">
      <Text className="text-foreground text-sm mb-3">
        Desktop desconectado. Conecte-se para sincronizar dados.
      </Text>
      <View className="flex-row gap-2">
        <Button size="sm" className="px-3 py-2" onPress={onRetry}>
          Tentar novamente
        </Button>
        <Button size="sm" variant="bordered" className="px-3 py-2" onPress={() => router.push("/pair")}>
          Reconectar
        </Button>
      </View>
    </Banner>
  );
}
