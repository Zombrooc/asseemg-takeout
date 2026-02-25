import { useState } from "react";

import { Card } from "@/components/ui";
import { Pressable, Text, View } from "@/lib/primitives";
import Ionicons from "@expo/vector-icons/Ionicons";

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
    <Pressable
      onPress={() => setExpanded(!expanded)}
      className="mb-4 min-h-[48px] active:opacity-90"
    >
      <Card className="rounded-2xl border border-border p-0 overflow-hidden bg-card">
        <View className="flex-row items-center gap-3 px-4 py-3.5">
          <Text className="text-foreground font-medium text-sm flex-1 leading-snug">
            Como encontrar o QR Code
          </Text>
          <View className="shrink-0">
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#64748b"
            />
          </View>
        </View>
        {expanded ? (
          <View className="px-4 pb-4 pt-0 border-t border-border">
            {TIPS.map((tip, i) => (
              <View key={i} className="flex-row gap-2 mt-2">
                <Text className="text-muted-foreground text-sm font-medium w-5 shrink-0 leading-snug">
                  {i + 1}.
                </Text>
                <Text className="text-muted-foreground text-sm flex-1 leading-relaxed">
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
