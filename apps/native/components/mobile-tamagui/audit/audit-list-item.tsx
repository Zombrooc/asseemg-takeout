import type { AuditEvent } from "@/lib/takeout-api-types";
import { formatDateBR } from "@/lib/format-date";
import { Card } from "@/components/ui-tamagui";
import { Text, View } from "react-native";

export function AuditListItem({ item }: { item: AuditEvent }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text
          style={{ color: "#111827", fontWeight: "500", flex: 1, minWidth: 0 }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.ticket_id}
        </Text>
        <Text style={{ color: "#6b7280", fontSize: 12 }}>{item.status}</Text>
      </View>
      <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
        {item.created_at ? formatDateBR(item.created_at) : "—"}
      </Text>
    </Card>
  );
}
