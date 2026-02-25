import { Button } from "@/components/ui";
import { View } from "@/lib/primitives";

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
    <View className="flex-row gap-2 flex-wrap items-center mt-2">
      <Button
        testID="events-scan-ticket"
        size="sm"
        variant="bordered"
        className="px-4 py-2 rounded-xl min-h-[40px] border-border"
        onPress={onScan}
      >
        Escanear ingresso
      </Button>
      <Button
        testID="events-reset-checkins"
        size="sm"
        variant="bordered"
        className="px-4 py-2 rounded-xl min-h-[40px] border-border"
        onPress={onReset}
        isLoading={resetLoading}
        isDisabled={resetLoading}
      >
        {undoCount > 0 ? `Desfazer (${undoCount})` : "Desfazer"}
      </Button>
    </View>
  );
}
