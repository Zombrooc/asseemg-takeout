import type { EventSummary } from "@/lib/takeout-api-types";
import { EventCard } from "./event-card";
import { Button, EmptyState, Spinner } from "@/components/ui-tamagui";
import { View } from "react-native";

type Props = {
  isLoading: boolean;
  events: EventSummary[];
  onOpenEvent: (eventId: string) => void;
  onPair?: () => void;
};

export function EventsList({ isLoading, events, onOpenEvent, onPair }: Props) {
  if (isLoading) {
    return (
      <View
        style={{
          paddingVertical: 48,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 160,
        }}
      >
        <Spinner size="large" />
      </View>
    );
  }

  if (!events.length) {
    return (
      <EmptyState
        title="Nenhum evento disponível"
        description="Importe eventos no app desktop para que apareçam aqui."
        action={
          onPair ? (
            <Button onPress={onPair}>Parear com o Desktop</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <View style={{ gap: 12, flex: 1 }}>
      {events.map((event) => (
        <EventCard key={event.eventId} event={event} onPress={onOpenEvent} />
      ))}
    </View>
  );
}
