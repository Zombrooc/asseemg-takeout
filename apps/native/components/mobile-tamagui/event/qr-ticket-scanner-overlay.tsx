import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function QrTicketScannerOverlay({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingTop: insets.top,
          paddingBottom: 12,
          paddingHorizontal: 8,
        }}
      >
        <Pressable
          onPress={onBack}
          style={{ minHeight: 44, minWidth: 44, justifyContent: "center", paddingRight: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", color: "white", fontWeight: "500" }} numberOfLines={1}>
          Escanear ingresso
        </Text>
        <View style={{ minWidth: 44 }} />
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: 16,
          paddingBottom: 16 + insets.bottom,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 14, marginBottom: 8 }}>
          Aponte para o QR code do ingresso
        </Text>
      </View>
    </>
  );
}
