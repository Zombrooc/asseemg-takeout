import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";
import { Button, Card, ScreenContainer } from "@/components/ui-tamagui";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <ScreenContainer mode="static">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <Card style={{ alignItems: "center", padding: 24, width: "90%", maxWidth: 400, alignSelf: "center" }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🤔</Text>
            <Text style={{ color: "#111827", fontWeight: "500", fontSize: 18, marginBottom: 4 }}>
              Page Not Found
            </Text>
            <Text style={{ color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              The page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <Button>Go Home</Button>
            </Link>
          </Card>
        </View>
      </ScreenContainer>
    </>
  );
}
