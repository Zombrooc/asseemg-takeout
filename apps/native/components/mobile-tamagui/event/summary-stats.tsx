import { Text, View } from "react-native";

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
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        gap: 12,
        borderBottomWidth: 1,
        borderColor: "#e5e7eb",
        flexWrap: "wrap",
        backgroundColor: "#ffffff",
      }}
    >
      <View
        style={{
          borderRadius: 8,
          padding: 12,
          flex: 1,
          minWidth: 80,
          backgroundColor: "rgba(156,163,175,0.1)",
          borderWidth: 1,
          borderColor: "rgba(229,231,235,0.5)",
          overflow: "hidden",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{total}</Text>
        <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Total</Text>
      </View>
      <View
        style={{
          borderRadius: 8,
          padding: 12,
          flex: 1,
          minWidth: 80,
          backgroundColor: "rgba(16,185,129,0.1)",
          borderWidth: 1,
          borderColor: "rgba(16,185,129,0.2)",
          overflow: "hidden",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#10b981" }}>{confirmed}</Text>
        <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Confirmados</Text>
      </View>
      <View
        style={{
          borderRadius: 8,
          padding: 12,
          flex: 1,
          minWidth: 80,
          backgroundColor: "rgba(245,158,11,0.1)",
          borderWidth: 1,
          borderColor: "rgba(245,158,11,0.2)",
          overflow: "hidden",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#f59e0b" }}>{pending}</Text>
        <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Aguardando</Text>
      </View>
      {pendingSync > 0 ? (
        <View
          style={{
            borderRadius: 8,
            padding: 12,
            backgroundColor: "rgba(156,163,175,0.2)",
            borderWidth: 1,
            borderColor: "rgba(229,231,235,0.5)",
            alignSelf: "center",
            overflow: "hidden",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{pendingSync}</Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Sync</Text>
        </View>
      ) : null}
    </View>
  );
}
