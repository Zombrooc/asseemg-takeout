import type { AuditEvent } from "@/lib/takeout-api-types";
import { formatDateBR } from "@/lib/format-date";

import { Card } from "@/components/ui";
import { Text, View } from "@/lib/primitives";

export function AuditListItem({ item }: { item: AuditEvent }) {
  return (
    <Card>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-foreground font-medium flex-1 min-w-0" numberOfLines={1} ellipsizeMode="tail">{item.ticket_id}</Text>
        <Text className="text-muted-foreground text-xs">{item.status}</Text>
      </View>
      <Text className="text-muted-foreground text-xs mt-1">
        {item.created_at ? formatDateBR(item.created_at) : "—"}
      </Text>
    </Card>
  );
}
