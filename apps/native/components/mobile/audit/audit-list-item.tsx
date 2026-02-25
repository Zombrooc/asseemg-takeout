import type { AuditEvent } from "@/lib/takeout-api-types";
import { formatDateBR } from "@/lib/format-date";

import { Card } from "@/components/ui";
import { Text, View } from "@/lib/primitives";

export function AuditListItem({ item }: { item: AuditEvent }) {
  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="text-foreground font-medium">{item.ticket_id}</Text>
        <Text className="text-muted-foreground text-xs">{item.status}</Text>
      </View>
      <Text className="text-muted-foreground text-xs mt-1">
        {item.created_at ? formatDateBR(item.created_at) : "—"}
      </Text>
    </Card>
  );
}
