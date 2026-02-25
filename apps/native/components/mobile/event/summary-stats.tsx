import { Text, View } from "@/lib/primitives";

type Props = {
  total: number;
  confirmed: number;
  pending: number;
  pendingSync?: number;
};

export function SummaryStats({
  total,
  confirmed,
  pending,
  pendingSync = 0,
}: Props) {
  return (
    <View className="px-4 py-3 flex-row gap-3 border-b border-border flex-wrap bg-background">
      <View className="rounded-xl p-3 flex-1 min-w-[80px] bg-muted/10 border border-border/50 overflow-hidden">
        <Text className="text-xl font-bold text-foreground leading-tight">
          {total}
        </Text>
        <Text className="text-muted-foreground text-xs mt-0.5 leading-snug">
          Total
        </Text>
      </View>
      <View className="rounded-xl p-3 flex-1 min-w-[80px] bg-success/10 border border-success/20 overflow-hidden">
        <Text className="text-xl font-bold text-success leading-tight">
          {confirmed}
        </Text>
        <Text className="text-muted-foreground text-xs mt-0.5 leading-snug">
          Confirmados
        </Text>
      </View>
      <View className="rounded-xl p-3 flex-1 min-w-[80px] bg-warning/10 border border-warning/20 overflow-hidden">
        <Text className="text-xl font-bold text-warning leading-tight">
          {pending}
        </Text>
        <Text className="text-muted-foreground text-xs mt-0.5 leading-snug">
          Aguardando
        </Text>
      </View>
      {pendingSync > 0 ? (
        <View className="rounded-xl p-3 bg-muted/20 border border-border/50 self-center overflow-hidden">
          <Text className="text-sm font-semibold text-foreground leading-tight">
            {pendingSync}
          </Text>
          <Text className="text-muted-foreground text-xs mt-0.5 leading-snug">
            Sync
          </Text>
        </View>
      ) : null}
    </View>
  );
}
