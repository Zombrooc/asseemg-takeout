import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { Button, ScreenContainer } from "@/components/ui-tamagui";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function SettingsScreen() {
  const router = useRouter();
  const { isPaired, baseUrl, clearConnection } = useTakeoutConnection();

  return (
    <ScreenContainer mode="static">
      <View style={{ padding: 16, paddingTop: 24, flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: "600", color: "#111827", marginBottom: 8 }}>
          Configurações
        </Text>
        <Text style={{ color: "#6b7280", marginBottom: 24 }}>
          Conexão e informações do app.
        </Text>

        {isPaired ? (
          <>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Desktop</Text>
              <Text style={{ color: "#111827" }} numberOfLines={1} ellipsizeMode="middle">
                {baseUrl || "—"}
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 16 }} />
            <Button
              testID="settings-unpair"
              variant="bordered"
              onPress={async () => {
                await clearConnection();
                router.replace("/pair");
              }}
            >
              Desparear
            </Button>
          </>
        ) : (
          <Text style={{ color: "#6b7280" }}>
            Não pareado. Use a tela inicial ou Parear para conectar ao desktop.
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}
