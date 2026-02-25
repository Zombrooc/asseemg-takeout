import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button, Card, ScreenContainer } from "@/components/ui-tamagui";

export default function Modal() {
  function handleClose() {
    router.back();
  }

  return (
    <ScreenContainer mode="static">
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Card style={{ padding: 20, width: "100%", maxWidth: "90%", alignSelf: "center" }}>
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 48,
                height: 48,
                backgroundColor: "#2563eb",
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="checkmark" size={24} color="white" />
            </View>
            <Text style={{ color: "#111827", fontWeight: "500", fontSize: 18, marginBottom: 4 }}>
              Modal Screen
            </Text>
            <Text style={{ color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              This is an example modal screen for dialogs and confirmations.
            </Text>
          </View>
          <Button onPress={handleClose} width="100%">
            Close
          </Button>
        </Card>
      </View>
    </ScreenContainer>
  );
}
