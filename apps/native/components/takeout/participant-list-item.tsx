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

  const isDefaultState =
    !state.showDismissConflict &&
    state.primaryActionLabel === "Fazer check-in" &&
    !state.primaryActionDisabled;
  const initials =
    name != null && name.trim()
      ? name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "—";

  return (
    <Surface
      variant="secondary"
      className="rounded-2xl mb-2 overflow-hidden border border-border"
      style={{ marginHorizontal: scale(16), padding: scale(16) }}
    >
      <View className="flex-row justify-between items-center gap-3">
        {isDefaultState ? (
          <View className="w-10 h-10 rounded-full bg-muted/20 items-center justify-center shrink-0">
            <Text className="text-foreground font-semibold text-sm leading-none">
              {initials}
            </Text>
          </View>
        ) : null}
        <View className="flex-1 min-w-0 shrink">
          <Text
            className="text-foreground font-medium text-base leading-snug"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {name ?? "—"}
          </Text>
          <Text
            className="text-muted-foreground text-sm mt-0.5 leading-snug"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {ticketLabel}
          </Text>
          {state.statusLabel ? (
            <Text className={statusClassName}>{state.statusLabel}</Text>
          ) : null}
        </View>
        {state.showDismissConflict ? (
          <Button
            testID={`participant-dismiss-${ticketId}`}
            size="sm"
            variant="outline"
            className="px-3 py-2 rounded-xl min-h-[36px] border-border shrink-0"
            onPress={() => onDismissConflict(ticketId)}
          >
            Dispensar
          </Button>
        ) : (
          <Button
            testID={`participant-confirm-${id}`}
            size="sm"
            className="px-3 py-2 rounded-xl min-h-[36px] shrink-0"
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
