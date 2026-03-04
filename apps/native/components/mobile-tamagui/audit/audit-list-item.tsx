import type { AuditEvent } from "@/lib/takeout-api-types";
import { formatDateBR } from "@/lib/format-date";
import { parseTakeoutRetirantePayload } from "@/lib/takeout-retirante-payload";
import { Card } from "@/components/ui-tamagui";
import { Text, View } from "react-native";

export function AuditListItem({ item }: { item: AuditEvent }) {
  const retirante = parseTakeoutRetirantePayload(item.payload_json);

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
        {item.created_at ? formatDateBR(item.created_at) : "-"}
      </Text>
      {retirante ? (
        <View style={{ marginTop: 6, gap: 2 }}>
          <Text style={{ color: "#111827", fontSize: 12 }}>Retirante: {retirante.retirante_nome}</Text>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>CPF: {retirante.retirante_cpf ?? "-"}</Text>
        </View>
      ) : null}
    </Card>
  );
}
