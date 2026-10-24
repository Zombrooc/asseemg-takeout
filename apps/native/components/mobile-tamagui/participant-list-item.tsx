import { memo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { Button, Card } from "@/components/ui-tamagui";
import { getParticipantListState } from "@/lib/participant-list-state";
import type { ParticipantAlert } from "@/lib/takeout-api-types";
import type { ParticipantSyncStatus } from "@/lib/participant-store";

export type ParticipantListItemProps = {
  entityKey: string;
  id: string;
  ticketId: string;
  name: string | null;
  ticketLabel: string;
  isConfirmed: boolean;
  isPendingSync: boolean;
  isConflict: boolean;
  syncStatus?: ParticipantSyncStatus;
  lockedByOther: boolean;
  alerts?: ParticipantAlert[];
  onPrimaryAction: (entityKey: string) => void;
  onEdit: (entityKey: string) => void;
  onDismissConflict: (ticketId: string) => void;
};

const statusColorMap = {
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#dc2626",
} as const;

function ParticipantListItemComponent({
  entityKey,
  id,
  ticketId,
  name,
  ticketLabel,
  isConfirmed,
  isPendingSync,
  isConflict,
  syncStatus,
  lockedByOther,
  alerts = [],
  onPrimaryAction,
  onEdit,
  onDismissConflict,
}: ParticipantListItemProps) {
  const state = getParticipantListState({
    isConfirmed,
    lockedByOther,
    isConflict,
    isPendingSync,
    syncStatus: syncStatus === "pending" || syncStatus === "sending" || syncStatus === "failed" ? syncStatus : null,
  });

  const statusColor =
    state.statusTone === "success"
      ? statusColorMap.success
      : state.statusTone === "warning"
        ? statusColorMap.warning
        : state.statusTone === "danger"
          ? statusColorMap.danger
          : "#111827";

  const initials =
    name?.trim()
      ? name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "—";

  const showInitials =
    !state.showDismissConflict &&
    state.primaryActionLabel === "Fazer check-in" &&
    !state.primaryActionDisabled;
  const hasAlerts = alerts.length > 0;

  return (
    <Card style={{ marginBottom: 8, marginHorizontal: 16, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        {hasAlerts ? (
          <View
            testID={`participant-alert-icon-${id}`}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              backgroundColor: "rgba(220,38,38,0.12)",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
          </View>
        ) : showInitials ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              backgroundColor: "rgba(156,163,175,0.2)",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "600", fontSize: 14 }}>{initials}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
          <Text
            style={{ color: "#111827", fontWeight: "500", fontSize: 16 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {name ?? "—"}
          </Text>
          <Text
            style={{ color: "#6b7280", fontSize: 14, marginTop: 2 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {ticketLabel}
          </Text>
          {state.statusLabel ? (
            <Text style={{ color: statusColor, fontSize: 12, marginTop: 4 }}>{state.statusLabel}</Text>
          ) : null}
          {alerts.map((alert) => (
            <Text
              key={`${id}-${alert.code}-${alert.message}`}
              style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}
            >
              {alert.message}
            </Text>
          ))}
        </View>
        {state.showDismissConflict ? (
          <Button
            testID={`participant-dismiss-${ticketId}`}
            variant="outline"
            onPress={() => onDismissConflict(ticketId)}
            style={{ flexShrink: 0 }}
          >
            Dispensar
          </Button>
        ) : (
          <View style={{ flexShrink: 0, gap: 6 }}>
            <Button
              testID={`participant-edit-${id}`}
              variant="outline"
              onPress={() => onEdit(entityKey)}
              isDisabled={isConfirmed || state.primaryActionDisabled}
            >
              Editar
            </Button>
            <Button
              testID={`participant-confirm-${id}`}
              onPress={() => onPrimaryAction(entityKey)}
              isDisabled={state.primaryActionDisabled}
            >
              {state.primaryActionLabel}
            </Button>
          </View>
        )}
      </View>
    </Card>
  );
}

export const ParticipantListItem = memo(ParticipantListItemComponent);
