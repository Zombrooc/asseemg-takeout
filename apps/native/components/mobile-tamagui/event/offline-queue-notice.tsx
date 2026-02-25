import { Banner } from "@/components/ui-tamagui";
import { Text } from "react-native";

export function OfflineQueueNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <Banner variant="warn" style={{ marginHorizontal: 16, marginTop: 8 }}>
      <Text style={{ color: "#6b7280", fontSize: 12 }}>
        Sem conexão. Check-in será sincronizado quando houver rede.
      </Text>
    </Banner>
  );
}
