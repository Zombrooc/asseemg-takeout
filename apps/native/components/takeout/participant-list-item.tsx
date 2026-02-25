import { memo } from "react";
import { Button, Surface } from "heroui-native";

import { getParticipantListState } from "@/lib/participant-list-state";
import { Text, View } from "@/lib/primitives";
import { useResponsiveScale } from "@/utils/responsive";

export type ParticipantListItemProps = {
  id: string;
  ticketId: string;
  name: string | null;
  ticketLabel: string;
  isConfirmed: boolean;
  isPendingSync: boolean;
  isConflict: boolean;
  lockedByOther: boolean;
  onPrimaryAction: (participantId: string) => void;
  onDismissConflict: (ticketId: string) => void;
};

function ParticipantListItemComponent({
  id,
  ticketId,
  name,
  ticketLabel,
  isConfirmed,
  isPendingSync,
  isConflict,
  lockedByOther,
  onPrimaryAction,
  onDismissConflict,
}: ParticipantListItemProps) {
  const { scale } = useResponsiveScale();
  const state = getParticipantListState({
    isConfirmed,
    lockedByOther,
    isConflict,
    isPendingSync,
  });

  const statusClassName =
    state.statusTone === "success"
      ? "text-success text-xs mt-1"
      : state.statusTone === "warning"
        ? "text-warning text-xs mt-1"
        : state.statusTone === "danger"
          ? "text-danger text-xs mt-1"
          : "";

  return (
    <Surface
      variant="secondary"
      className="rounded-2xl mb-2"
      style={{ marginHorizontal: scale(16), padding: scale(16) }}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-foreground font-medium">{name ?? "—"}</Text>
          <Text className="text-muted-foreground text-sm">{ticketLabel}</Text>
          {state.statusLabel ? (
            <Text className={statusClassName}>{state.statusLabel}</Text>
          ) : null}
        </View>
        {state.showDismissConflict ? (
          <Button
            size="sm"
            variant="outline"
            className="px-3 py-2"
            onPress={() => onDismissConflict(ticketId)}
          >
            Dispensar
          </Button>
        ) : (
          <Button
            size="sm"
            className="px-3 py-2"
            onPress={() => onPrimaryAction(id)}
            isDisabled={state.primaryActionDisabled}
          >
            {state.primaryActionLabel}
          </Button>
        )}
      </View>
    </Surface>
  );
}

export const ParticipantListItem = memo(ParticipantListItemComponent);
