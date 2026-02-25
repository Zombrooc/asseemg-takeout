import { Link, Stack } from "expo-router";
import { Button, Surface } from "heroui-native";

import { Container } from "@/components/container";
import { Text, View } from "@/lib/primitives";
import { useResponsiveScale } from "@/utils/responsive";

export default function NotFoundScreen() {
  const { scale, width } = useResponsiveScale();
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View
          className="flex-1 justify-center items-center"
          style={{ padding: scale(16) }}
        >
          <Surface
            variant="secondary"
            className="items-center p-6 rounded-3xl"
            style={{ width: "90%", maxWidth: width * 0.9 }}
          >
            <Text className="text-4xl mb-3">🤔</Text>
            <Text className="text-foreground font-medium text-lg mb-1">
              Page Not Found
            </Text>
            <Text className="text-muted-foreground text-sm text-center mb-4">
              The page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <Button size="sm" className="px-3 py-2">
                Go Home
              </Button>
            </Link>
          </Surface>
        </View>
      </Container>
    </>
  );
}
