import { Text, View } from "react-native";
import { Button, Input } from "@/components/ui-tamagui";

type Props = {
  baseUrl: string;
  pairingToken: string;
  onChangeBaseUrl: (value: string) => void;
  onChangeToken: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
};

export function ManualPairForm({
  baseUrl,
  pairingToken,
  onChangeBaseUrl,
  onChangeToken,
  onSubmit,
  loading,
  error,
}: Props) {
  return (
    <View>
      <Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 6 }}>
        URL do servidor
      </Text>
      <Input
        placeholder="http://192.168.0.5:5555"
        value={baseUrl}
        onChangeText={onChangeBaseUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={{ marginBottom: 16, minHeight: 48 }}
      />
      <Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 6 }}>
        Token de acesso
      </Text>
      <Input
        placeholder="cole o token aqui..."
        value={pairingToken}
        onChangeText={onChangeToken}
        autoCapitalize="characters"
        autoCorrect={false}
        style={{ marginBottom: 24, minHeight: 48 }}
      />
      {error ? (
        <Text style={{ color: "#dc2626", fontSize: 14, marginBottom: 16 }}>
          {error}
        </Text>
      ) : null}
      <Button
        testID="pair-submit-button"
        onPress={onSubmit}
        loading={loading}
        isDisabled={loading}
      >
        Conectar
      </Button>
    </View>
  );
}
