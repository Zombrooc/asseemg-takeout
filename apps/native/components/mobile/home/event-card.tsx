import type { EventSummary } from "@/lib/takeout-api-types";
import { formatDateBR } from "@/lib/format-date";

import { Card } from "@/components/ui";
import { Pressable, Text } from "@/lib/primitives";

type Props = {
  event: EventSummary;
  onPress: (eventId: string) => void;
};

export function EventCard({ event, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(event.eventId)} style={({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <Card>
        <Text className="text-foreground font-medium">{event.name ?? event.eventId}</Text>
        {event.startDate ? <Text className="text-muted-foreground text-sm mt-1">{formatDateBR(event.startDate)}</Text> : null}
      </Card>
    </Pressable>
  );
}
