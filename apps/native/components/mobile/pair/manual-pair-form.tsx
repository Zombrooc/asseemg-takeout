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
      <Text className="text-foreground font-medium text-sm mb-1.5 leading-snug">
        URL do servidor
      </Text>
      <Input
        placeholder="http://192.168.0.5:5555"
        value={baseUrl}
        onChangeText={onChangeBaseUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        className="mb-4 rounded-xl min-h-[48px] border border-border bg-card w-full text-base"
      />
      <Text className="text-foreground font-medium text-sm mb-1.5 leading-snug">
        Token de acesso
      </Text>
      <Input
        placeholder="cole o token aqui..."
        value={pairingToken}
        onChangeText={onChangeToken}
        autoCapitalize="characters"
        autoCorrect={false}
        className="mb-6 rounded-xl min-h-[48px] border border-border bg-card w-full text-base"
      />
      {error ? (
        <Text className="text-danger text-sm mb-4 leading-snug">{error}</Text>
      ) : null}
      <Button
        testID="pair-submit-button"
        className="px-4 py-3 rounded-xl min-h-[48px]"
        onPress={onSubmit}
        isLoading={loading}
        isDisabled={loading}
      >
        Conectar
      </Button>
    </>
  );
}
