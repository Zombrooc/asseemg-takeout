import type { EventSummary } from "@/lib/takeout-api-types";
import { Spinner } from "heroui-native";

import { EventCard } from "@/components/mobile/home/event-card";
import { Text, View } from "@/lib/primitives";

type Props = {
  isLoading: boolean;
  events: EventSummary[];
  onOpenEvent: (eventId: string) => void;
};

export function EventsList({ isLoading, events, onOpenEvent }: Props) {
  if (isLoading) {
    return (
      <View className="py-8 items-center">
        <Spinner size="lg" />
      </View>
    );
  }

  if (!events.length) {
    return (
      <Text className="text-muted-foreground py-6">
        Nenhum evento importado. Importe eventos no app desktop para listá-los aqui.
      </Text>
    );
  }

  return (
    <View className="gap-3">
      {events.map((event) => (
        <EventCard key={event.eventId} event={event} onPress={onOpenEvent} />
      ))}
    </View>
  );
}
