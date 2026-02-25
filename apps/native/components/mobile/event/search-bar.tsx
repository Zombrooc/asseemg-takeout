import Ionicons from "@expo/vector-icons/Ionicons";
import { Input } from "@/components/ui";
import { Pressable, View } from "@/lib/primitives";

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
    <View className="relative mb-2 w-full">
      <View className="absolute left-3 top-0 bottom-0 justify-center z-10 pointer-events-none">
        <Ionicons name="search" size={20} color="#64748b" />
      </View>
      <Input
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        className="pl-9 pr-9 rounded-xl min-h-[44px] border border-border bg-card w-full text-base text-foreground"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChange("")}
          className="absolute right-3 top-0 bottom-0 justify-center z-10 p-1 active:opacity-70"
          accessibilityLabel="Limpar busca"
        >
          <Ionicons name="close-circle" size={20} color="#64748b" />
        </Pressable>
      ) : null}
    </View>
  );
}
