import { Button, Card } from "@/components/ui-tamagui";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { formatDateBR } from "@/lib/format-date";
import { TakeoutApiError } from "@/lib/takeout-api";
import type {
  CustomFormResponseItem,
  EventParticipant,
  LegacyEventParticipant,
} from "@/lib/takeout-api-types";
import { addToQueue } from "@/lib/takeout-queue";
import { useResponsiveScale } from "@/utils/responsive";
import React, { useEffect, useRef, useState } from "react";
import { Alert, type GestureResponderEvent, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

const LOCK_RENEW_INTERVAL_MS = 15_000;

type SourceType = "json_sync" | "legacy_csv";
type ModalParticipant = EventParticipant | LegacyEventParticipant;

type Props = {
  visible: boolean;
  participant: ModalParticipant | null;
  sourceType?: SourceType;
  eventId?: string;
  onClose: () => void;
  onConfirmed: () => void;
  onQueuedOffline?: () => void;
  onConflict?: (ticketId: string) => void;
};

function formatBirthDate(s: string | null | undefined): string {
  return formatDateBR(s);
}

function ageFromBirthDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
    age--;
  }
  return age >= 0 ? String(age) : "—";
}

function formatResponseValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function buildTicketConflictKey(participant: ModalParticipant, sourceType: SourceType): string {
  if (sourceType === "legacy_csv") return participant.id;
  return (participant as EventParticipant).ticketId;
}

export function ConfirmTakeoutModal({
  visible,
  participant,
  sourceType = "json_sync",
  eventId,
  onClose,
  onConfirmed,
  onQueuedOffline,
  onConflict,
}: Props) {
  const insets = useSafeAreaInsets();
  const { scale, width } = useResponsiveScale();
  const { api, deviceId } = useTakeoutConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockState, setLockState] = useState<"heldByMe" | "heldByOther" | null>(null);
  const renewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible || !participant || !api || !deviceId) {
      setLockState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await api.postLocksAcquire(participant.id, deviceId);
        if (cancelled) return;
        setLockState("heldByMe");
        renewIntervalRef.current = setInterval(() => {
          api.postLocksRenew(participant.id, deviceId).catch(() => {});
        }, LOCK_RENEW_INTERVAL_MS);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof TakeoutApiError && e.status === 409) {
          setLockState("heldByOther");
        } else {
          setLockState(null);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (renewIntervalRef.current) {
        clearInterval(renewIntervalRef.current);
        renewIntervalRef.current = null;
      }
      if (participant && api && deviceId) {
        api.deleteLocksRelease(participant.id, deviceId).catch(() => {});
      }
    };
  }, [visible, participant?.id, api, deviceId]);

  const handleClose = () => {
    if (participant && api && deviceId && lockState === "heldByMe") {
      api.deleteLocksRelease(participant.id, deviceId).catch(() => {});
    }
    setLockState(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!participant || !api || !deviceId) return;
    if (sourceType === "legacy_csv" && !eventId) {
      setError("Event ID ausente para confirmação legado.");
      return;
    }
    setError(null);
    setLoading(true);
    const requestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    try {
      const res =
        sourceType === "legacy_csv"
          ? await api.postLegacyTakeoutConfirm({
              request_id: requestId,
              event_id: eventId!,
              participant_id: participant.id,
              device_id: deviceId,
            })
          : await api.postTakeoutConfirm({
              request_id: requestId,
              ticket_id: (participant as EventParticipant).ticketId,
              device_id: deviceId,
            });
      if (res.status === "CONFIRMED" || res.status === "DUPLICATE") {
        api.deleteLocksRelease(participant.id, deviceId).catch(() => {});
        onConfirmed();
        onClose();
      } else {
        setError(`Resposta inesperada: ${res.status}`);
      }
    } catch (e) {
      if (e instanceof TakeoutApiError && e.status === 409) {
        onClose();
        onConflict?.(buildTicketConflictKey(participant, sourceType));
        Alert.alert("Conflito", "Check-in já realizado por outro dispositivo.");
        return;
      }
      if (sourceType === "legacy_csv") {
        Alert.alert("Erro", "Falha ao confirmar retirada no legado.");
        return;
      }
      try {
        await addToQueue({
          request_id: requestId,
          ticket_id: (participant as EventParticipant).ticketId,
          device_id: deviceId,
        });
        onQueuedOffline?.();
      } catch {
        // ignore queue persist failure
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!participant) return null;

  const legacy = sourceType === "legacy_csv" ? (participant as LegacyEventParticipant) : null;
  const current = sourceType === "json_sync" ? (participant as EventParticipant) : null;
  const isLockedByOther = lockState === "heldByOther";
  const canConfirm = !isLockedByOther;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingHorizontal: scale(16),
        }}
        onPress={handleClose}
      >
        <Pressable style={{ width: "90%", maxWidth: width * 0.9 }} onPress={(e: GestureResponderEvent) => e.stopPropagation()}>
          <Card padding="$6">
            <Text fontSize={18} fontWeight="600" color="$foreground" marginBottom="$4">
              Confirmar check-in
            </Text>
            {lockState === "heldByMe" ? (
              <Text color="$textSecondary" fontSize={14} marginBottom="$2">
                Em atendimento por você
              </Text>
            ) : isLockedByOther ? (
              <Text color="$warning" fontSize={14} marginBottom="$2">
                Em atendimento por outro dispositivo
              </Text>
            ) : null}
            <YStack gap="$2" marginBottom="$4">
              <Row label="Nome" value={(legacy?.name ?? current?.name) ?? "—"} />
              <Row label="CPF" value={(legacy?.cpf ?? current?.cpf) ?? "—"} />
              <Row label="Data de nascimento" value={formatBirthDate(legacy?.birthDate ?? current?.birthDate)} />
              <Row label="Idade" value={ageFromBirthDate(legacy?.birthDate ?? current?.birthDate)} />
              <Row
                label="Ingresso"
                value={
                  legacy != null ? `#${legacy.bibNumber}` : ((current?.sourceTicketId ?? current?.ticketId) ?? "—")
                }
              />
              <Row label="Tipo de ingresso" value={(legacy?.modality ?? current?.ticketName) ?? "—"} />
              <Row label="Tamanho da camisa" value={legacy?.shirtSize ?? "—"} />
              <Row label="Equipe" value={legacy?.team ?? "—"} />
            </YStack>
            {current?.customFormResponses && current.customFormResponses.length > 0 ? (
              <YStack marginBottom="$4">
                <Text color="$textSecondary" fontSize={12} fontWeight="500" marginBottom="$2">
                  Dados adicionais
                </Text>
                <YStack gap="$2">
                  {current.customFormResponses.map((r: CustomFormResponseItem, i: number) => (
                    <Row key={i} label={r.label || r.name} value={formatResponseValue(r.response)} />
                  ))}
                </YStack>
              </YStack>
            ) : null}
            {error ? (
              <Text color="$danger" fontSize={14} marginBottom="$3">
                {error}
              </Text>
            ) : null}
            <XStack gap="$3">
              <Button testID="takeout-confirm-modal-cancel" variant="bordered" onPress={handleClose} isDisabled={loading}>
                Cancelar
              </Button>
              <Button
                testID="takeout-confirm-modal-confirm"
                onPress={handleConfirm}
                isLoading={loading}
                isDisabled={loading || !canConfirm}
              >
                Confirmar check-in
              </Button>
            </XStack>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between">
      <Text color="$textSecondary" fontSize={14}>
        {label}
      </Text>
      <Text color="$foreground" fontSize={14}>
        {value}
      </Text>
    </XStack>
  );
}
