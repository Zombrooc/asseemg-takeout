import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";
import { Input } from "@/components/ui-tamagui";

export function SearchBar({
  value,
  onChange,
  placeholder = "Buscar por nome, CPF ou ingresso...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ position: "relative", marginBottom: 8, width: "100%" }}>
      <View
        style={{
          position: "absolute",
          left: 12,
          top: 0,
          bottom: 0,
          justifyContent: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <Ionicons name="search" size={20} color="#64748b" />
      </View>
      <Input
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ paddingLeft: 36, paddingRight: 36, minHeight: 44 }}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChange("")}
          style={{
            position: "absolute",
            right: 12,
            top: 0,
            bottom: 0,
            justifyContent: "center",
            zIndex: 10,
            padding: 4,
          }}
          accessibilityLabel="Limpar busca"
        >
          <Ionicons name="close-circle" size={20} color="#64748b" />
        </Pressable>
      ) : null}
    </View>
  );
}
