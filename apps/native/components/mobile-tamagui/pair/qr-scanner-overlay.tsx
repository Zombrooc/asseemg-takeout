import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui-tamagui";
import { Text, YStack } from "tamagui";

export function QrScannerOverlay({
  description,
  onCancel,
}: {
  description: string;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <YStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      backgroundColor="rgba(0,0,0,0.7)"
      padding="$4"
      paddingBottom={16 + insets.bottom}
    >
      <Text color="white" textAlign="center" fontSize={14} marginBottom="$2">
        {description}
      </Text>
      <Button variant="bordered" onPress={onCancel}>
        Cancelar
      </Button>
    </YStack>
  );
}
