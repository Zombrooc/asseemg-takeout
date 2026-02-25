import type { EventSummary } from "@/lib/takeout-api-types";
import { formatDateBR } from "@/lib/format-date";
import { Badge, Card } from "@/components/ui-tamagui";
import { Pressable, Text, View } from "react-native";

type Props = {
  event: EventSummary;
  onPress: (eventId: string) => void;
  isLive?: boolean;
  totalParticipants?: number;
  confirmed?: number;
};

export function EventCard({
  event,
  onPress,
  isLive = true,
  totalParticipants,
  confirmed,
}: Props) {
  const formattedDate = event.startDate ? formatDateBR(event.startDate) : null;
  const hasStats =
    totalParticipants != null &&
    confirmed != null &&
    totalParticipants >= 0 &&
    confirmed >= 0;
  const pct =
    hasStats && totalParticipants! > 0
      ? Math.round((confirmed! / totalParticipants!) * 100)
      : 0;

  return (
    <Pressable
      testID={`event-card-${event.eventId}`}
      onPress={() => onPress(event.eventId)}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <Card style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
        <View
          style={{
            height: 6,
            width: "100%",
            backgroundColor: "#6366f1",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        />
        <View style={{ padding: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
              <Text
                style={{ color: "#111827", fontWeight: "600", fontSize: 16 }}
                numberOfLines={2}
              >
                {event.name ?? event.eventId}
              </Text>
              {formattedDate ? (
                <Text style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
                  {formattedDate}
                </Text>
              ) : null}
            </View>
            <Badge variant={isLive ? "success" : "default"}>
              {isLive ? "LIVE" : "OFFLINE"}
            </Badge>
          </View>

          {hasStats ? (
            <>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                <Text style={{ color: "#6b7280", fontSize: 14 }}>
                  {totalParticipants} participantes
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 14 }}>
                  {confirmed} confirmados
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <View
                  style={{
                    height: 8,
                    borderRadius: 9999,
                    backgroundColor: "rgba(156,163,175,0.3)",
                    overflow: "hidden",
                    width: "100%",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      borderRadius: 9999,
                      backgroundColor: "#6366f1",
                      width: `${Math.min(100, pct)}%`,
                    }}
                  />
                </View>
                <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                  Progresso {pct}%
                </Text>
              </View>
            </>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: 14, fontWeight: "500" }}>
              Ver participantes
            </Text>
            <Text style={{ color: "#6b7280", fontSize: 18 }}>›</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
