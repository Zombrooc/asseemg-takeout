import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Card } from "@/components/ui-tamagui";

const TIPS = [
  "Abra o app Takeout Desktop no computador",
  "Aguarde o servidor iniciar (indicador verde na tela inicial)",
  "O QR Code e URL ficam visíveis na seção de pareamento",
  "O token é renovado a cada sessão por segurança",
  "Dispositivo e desktop devem estar na mesma rede Wi-Fi",
];

export function PairingTipsCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable onPress={() => setExpanded(!expanded)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden", minHeight: 48 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, flex: 1 }}>
            Como encontrar o QR Code
          </Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
        </View>
        {expanded ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 0,
              borderTopWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            {TIPS.map((tip, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Text style={{ color: "#6b7280", fontSize: 14, fontWeight: "500", width: 20, flexShrink: 0 }}>
                  {i + 1}.
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 14, flex: 1 }}>{tip}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
