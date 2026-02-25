import { Text, View } from "@/lib/primitives";

export function SummaryStats({ total, confirmed, pending }: { total: number; confirmed: number; pending: number }) {
  return (
    <View className="px-4 py-3 flex-row gap-4 border-b border-border">
      <View>
        <Text className="text-2xl font-bold text-foreground">{total}</Text>
        <Text className="text-muted-foreground text-xs">Total</Text>
      </View>
      <View>
        <Text className="text-2xl font-bold text-success">{confirmed}</Text>
        <Text className="text-muted-foreground text-xs">Confirmados</Text>
      </View>
      <View>
        <Text className="text-2xl font-bold text-warning">{pending}</Text>
        <Text className="text-muted-foreground text-xs">Aguardando</Text>
      </View>
    </View>
  );
}
