import type { EventSummary } from "@/lib/takeout-api-types";
import { formatDateBR } from "@/lib/format-date";

import { Card, Chip } from "@/components/ui";
import { Pressable, Text, View } from "@/lib/primitives";

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
    hasStats && totalParticipants > 0
      ? Math.round((confirmed! / totalParticipants!) * 100)
      : 0;

  return (
    <Pressable
      testID={`event-card-${event.eventId}`}
      onPress={() => onPress(event.eventId)}
      className="mb-3 active:opacity-80 rounded-2xl"
    >
      <Card className="overflow-hidden p-0 border border-border rounded-2xl bg-card">
        <View className="h-1.5 w-full bg-accent rounded-t-2xl" />
        <View className="p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 min-w-0 shrink">
              <Text
                className="text-foreground font-semibold text-base leading-tight"
                numberOfLines={2}
              >
                {event.name ?? event.eventId}
              </Text>
              {formattedDate ? (
                <Text className="text-muted-foreground text-sm mt-1 leading-snug">
                  {formattedDate}
                </Text>
              ) : null}
            </View>
            <View className="shrink-0">
              <Chip color={isLive ? "success" : "default"} size="sm">
                <Chip.Label>{isLive ? "LIVE" : "OFFLINE"}</Chip.Label>
              </Chip>
            </View>
          </View>

          {hasStats ? (
            <>
              <View className="flex-row gap-4 mt-3">
                <Text className="text-muted-foreground text-sm leading-snug">
                  {totalParticipants} participantes
                </Text>
                <Text className="text-muted-foreground text-sm leading-snug">
                  {confirmed} confirmados
                </Text>
              </View>
              <View className="mt-2">
                <View className="h-2 rounded-full bg-muted/30 overflow-hidden w-full">
                  <View
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </View>
                <Text className="text-muted-foreground text-xs mt-1 leading-tight">
                  Progresso {pct}%
                </Text>
              </View>
            </>
          ) : null}

          <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-border">
            <Text className="text-muted-foreground text-sm font-medium">
              Ver participantes
            </Text>
            <Text className="text-muted-foreground text-lg leading-none">
              ›
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
