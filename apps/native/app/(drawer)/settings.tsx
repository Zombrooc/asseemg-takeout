import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { Button, Container, Divider } from "@/components/ui";
import { useRouter } from "expo-router";
import { Text, View } from "@/lib/primitives";

export default function SettingsScreen() {
  const router = useRouter();
  const { isPaired, baseUrl, clearConnection } = useTakeoutConnection();

  return (
    <Container className="px-4 py-6" contentClassName="flex-1">
      <Text className="text-2xl font-semibold text-foreground mb-2">
        Configuracoes
      </Text>
      <Text className="text-muted-foreground mb-6">
        Conexão e informações do app.
      </Text>

      {isPaired ? (
        <>
          <View className="mb-4">
            <Text className="text-muted-foreground text-xs mb-1">Desktop</Text>
            <Text className="text-foreground" numberOfLines={1} ellipsizeMode="middle">
              {baseUrl || "—"}
            </Text>
          </View>
          <Divider className="my-4" />
          <Button
            testID="settings-unpair"
            variant="bordered"
            className="px-4 py-3"
            onPress={async () => {
              await clearConnection();
              router.replace("/pair");
            }}
          >
            Desparear
          </Button>
        </>
      ) : (
        <Text className="text-muted-foreground">
          Nao pareado. Use a tela inicial ou Parear para conectar ao desktop.
        </Text>
      )}
    </Container>
  );
}
