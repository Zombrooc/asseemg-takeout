import type { AuditEvent } from "@/lib/takeout-api-types";
import { formatDateBR } from "@/lib/format-date";
import { getAuditItemTitle } from "@/lib/audit-item-title";

import { Card } from "@/components/ui";
import { Text, View } from "@/lib/primitives";

function statusLabel(status: AuditEvent["status"]): string {
  switch (status) {
    case "CONFIRMED":
      return "Confirmado";
    case "DUPLICATE":
      return "Duplicado";
    case "FAILED":
      return "Falho";
    case "REVERSED":
      return "Desfeito";
  }
}

export function AuditListItem({ item }: { item: AuditEvent }) {
  const title = getAuditItemTitle(item);
  return (
    <Card>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-foreground font-medium flex-1 min-w-0" numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        <Text className="text-muted-foreground text-xs">{statusLabel(item.status)}</Text>
      </View>
      <Text className="text-muted-foreground text-xs mt-1">
        {item.created_at ? formatDateBR(item.created_at) : "—"}
      </Text>
    </Card>
  );
}
