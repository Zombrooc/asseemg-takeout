import { Button } from "@/components/ui";
import { Text, View } from "@/lib/primitives";
import { useResponsiveScale } from "@/utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function QrScannerOverlay({ description, onCancel }: { description: string; onCancel: () => void }) {
  const insets = useSafeAreaInsets();
  const { scale } = useResponsiveScale();

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-black/70" style={{ padding: scale(16), paddingBottom: scale(16) + insets.bottom }}>
      <Text className="text-white text-center text-sm mb-2">{description}</Text>
      <Button variant="bordered" className="px-4 py-3" onPress={onCancel}>Cancelar</Button>
    </View>
  );
}
