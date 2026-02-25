import { View } from "react-native";
import { Button } from "@/components/ui-tamagui";

type Props = {
  onScan: () => void;
  onReset: () => void;
  resetLoading: boolean;
  undoCount?: number;
};

export function QuickActionsRow({
  onScan,
  onReset,
  resetLoading,
  undoCount = 0,
}: Props) {
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
      <Button testID="events-scan-ticket" variant="bordered" onPress={onScan}>
        Escanear ingresso
      </Button>
      <Button
        testID="events-reset-checkins"
        variant="bordered"
        onPress={onReset}
        loading={resetLoading}
        isDisabled={resetLoading}
      >
        {undoCount > 0 ? `Desfazer (${undoCount})` : "Desfazer"}
      </Button>
    </View>
  );
}
