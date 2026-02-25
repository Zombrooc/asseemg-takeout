import type { EventSummary } from "@/lib/takeout-api-types";
import { Spinner } from "heroui-native";

import { EventCard } from "@/components/mobile/home/event-card";
import { EmptyState } from "@/components/ui";
import { Text, View } from "@/lib/primitives";

type Props = {
  isLoading: boolean;
  events: EventSummary[];
  onOpenEvent: (eventId: string) => void;
  onPair?: () => void;
};

export function EventsList({ isLoading, events, onOpenEvent, onPair }: Props) {
  if (isLoading) {
    return (
      <View className="py-12 items-center justify-center min-h-[160px]">
        <Spinner size="lg" />
      </View>
    );
  }

  if (!events.length) {
    return (
      <EmptyState
        title="Nenhum evento disponível"
        description="Importe eventos no app desktop para que apareçam aqui."
        cta={
          onPair
            ? { label: "Parear com o Desktop", onPress: onPair }
            : undefined
        }
      />
    );
  }

  return (
    <View className="gap-3 flex-1">
      {events.map((event) => (
        <EventCard key={event.eventId} event={event} onPress={onOpenEvent} />
      ))}
    </View>
  );
}
