import { Button, Input } from "heroui-native";

import { Text, View } from "@/lib/primitives";

type Props = {
  query: string;
  status: "" | "CONFIRMED" | "DUPLICATE";
  onQueryChange: (value: string) => void;
  onStatusChange: (value: "" | "CONFIRMED" | "DUPLICATE") => void;
  onReset: () => void;
};

export function AuditFilters({ query, status, onQueryChange, onStatusChange, onReset }: Props) {
  return (
    <View className="gap-2">
      <Input
        testID="audit-query-input"
        label="Buscar"
        placeholder="Buscar por ticket"
        value={query}
        onChangeText={onQueryChange}
      />
      <View className="flex-row gap-2 items-center">
        <Text className="text-muted-foreground">Status:</Text>
        <Button
          size="sm"
          variant={status === "" ? "solid" : "bordered"}
          onPress={() => onStatusChange("")}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={status === "CONFIRMED" ? "solid" : "bordered"}
          onPress={() => onStatusChange("CONFIRMED")}
        >
          Confirmado
        </Button>
        <Button
          size="sm"
          variant={status === "DUPLICATE" ? "solid" : "bordered"}
          onPress={() => onStatusChange("DUPLICATE")}
        >
          Duplicado
        </Button>
      </View>
      <Button testID="cta-reset" size="sm" variant="bordered" onPress={onReset}>
        Limpar filtros
      </Button>
    </View>
  );
}
