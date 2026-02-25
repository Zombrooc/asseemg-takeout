import { Text, View } from "react-native";
import { Button } from "@/components/ui-tamagui";

type Props = {
  title: string;
  description: string;
  onConfirm: () => void;
  onBack: () => void;
};

export function PermissionPrompt({ title, description, onConfirm, onBack }: Props) {
  return (
    <View>
      <Text style={{ color: "#111827", fontWeight: "500", marginBottom: 8 }}>{title}</Text>
      <Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>{description}</Text>
      <Button onPress={onConfirm}>Permitir câmera</Button>
      <View style={{ marginTop: 12 }}>
        <Button variant="bordered" onPress={onBack}>
          Voltar
        </Button>
      </View>
    </View>
  );
}
