import { Button, Input } from "@/components/ui";
import { Text } from "@/lib/primitives";

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
    <>
      <Text className="text-muted-foreground text-xs mb-2">Ou digite:</Text>
      <Input
        placeholder="http://192.168.0.5:5555"
        value={baseUrl}
        onChangeText={onChangeBaseUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        className="mb-4"
      />
      <Input
        placeholder="Token exibido no desktop"
        value={pairingToken}
        onChangeText={onChangeToken}
        autoCapitalize="characters"
        autoCorrect={false}
        className="mb-6"
      />
      {error ? <Text className="text-danger text-sm mb-4">{error}</Text> : null}
      <Button testID="pair-submit-button" className="px-4 py-3" onPress={onSubmit} isLoading={loading} isDisabled={loading}>
        Conectar
      </Button>
    </>
  );
}
