import { Surface } from "heroui-native";

import { Pressable, Text } from "@/lib/primitives";
import { formatDateBR } from "@/lib/format-date";

type Props = {
  eventId: string;
  name: string | null;
  startDate?: string | null;
  onPress: (eventId: string) => void;
};

export function EventCard({ eventId, name, startDate, onPress }: Props) {
  return (
    <Pressable testID={`event-card-${eventId}`} onPress={() => onPress(eventId)}>
      <Surface variant="secondary" className="p-4 rounded-2xl">
        <Text className="text-foreground font-medium">{name ?? eventId}</Text>
        {startDate ? (
          <Text className="text-muted-foreground text-sm mt-1">{formatDateBR(startDate)}</Text>
        ) : null}
      </Surface>
    </Pressable>
  );
}
