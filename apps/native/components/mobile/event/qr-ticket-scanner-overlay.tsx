import Ionicons from "@expo/vector-icons/Ionicons";

import { IconButton } from "@/components/ui";
import { Text, View } from "@/lib/primitives";
import { useResponsiveScale } from "@/utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function QrTicketScannerOverlay({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { scale } = useResponsiveScale();

  return (
    <>
      <View
        className="absolute top-0 left-0 right-0 flex-row items-center bg-black/70"
        style={{ paddingTop: insets.top, paddingBottom: scale(12), paddingHorizontal: scale(8) }}
      >
        <IconButton onPress={onBack} className="justify-center pr-2" style={{ minHeight: scale(44), minWidth: scale(44) }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </IconButton>
        <Text className="flex-1 text-center text-white font-medium" numberOfLines={1}>
          Escanear ingresso
        </Text>
        <View style={{ minWidth: scale(44) }} />
      </View>

      <View
        className="absolute bottom-0 left-0 right-0 bg-black/70"
        style={{ padding: scale(16), paddingBottom: scale(16) + insets.bottom }}
      >
        <Text className="text-white text-center text-sm mb-2">Aponte para o QR code do ingresso</Text>
      </View>
    </>
  );
}
