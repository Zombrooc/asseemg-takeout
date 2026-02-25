import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Button, Surface, useThemeColor } from "heroui-native";

import { Container } from "@/components/container";
import { Text, View } from "@/lib/primitives";
import { useResponsiveScale } from "@/utils/responsive";

function Modal() {
  const accentForegroundColor = useThemeColor("accent-foreground");
  const { scale, width } = useResponsiveScale();

  function handleClose() {
    router.back();
  }

  return (
    <Container>
      <View
        className="flex-1 justify-center items-center"
        style={{ padding: scale(16) }}
      >
        <Surface
          variant="secondary"
          className="p-5 w-full rounded-3xl"
          style={{ maxWidth: width * 0.9 }}
        >
          <View className="items-center">
            <View className="w-12 h-12 bg-accent rounded-2xl items-center justify-center mb-3">
              <Ionicons
                name="checkmark"
                size={24}
                color={accentForegroundColor}
              />
            </View>
            <Text className="text-foreground font-medium text-lg mb-1">
              Modal Screen
            </Text>
            <Text className="text-muted-foreground text-sm text-center mb-4">
              This is an example modal screen for dialogs and confirmations.
            </Text>
          </View>
          <Button onPress={handleClose} className="px-4 py-3 w-full" size="sm">
            <Button.Label>Close</Button.Label>
          </Button>
        </Surface>
      </View>
    </Container>
  );
}

export default Modal;
