import { Banner } from "@/components/ui";
import { Text } from "@/lib/primitives";

export function OfflineQueueNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <Banner className="mx-4 mt-2 px-3 py-2">
      <Text className="text-muted-foreground text-xs">
        Sem conexão. Check-in será sincronizado quando houver rede.
      </Text>
    </Banner>
  );
}
