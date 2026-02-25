import { Button } from "@/components/ui";
import { View } from "@/lib/primitives";

type Props = {
  onScan: () => void;
  onReset: () => void;
  resetLoading: boolean;
};

export function QuickActionsRow({ onScan, onReset, resetLoading }: Props) {
  return (
    <View className="flex-row gap-2 flex-wrap">
      <Button size="sm" variant="bordered" className="px-3 py-2" onPress={onScan}>
        Escanear ingresso
      </Button>
      <Button
        size="sm"
        variant="bordered"
        className="px-3 py-2"
        onPress={onReset}
        isLoading={resetLoading}
        isDisabled={resetLoading}
      >
        Desfazer check-ins
      </Button>
    </View>
  );
}
