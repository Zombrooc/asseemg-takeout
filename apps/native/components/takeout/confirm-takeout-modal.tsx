import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { formatDateBR } from "@/lib/format-date";
import { TakeoutApiError } from "@/lib/takeout-api";
import type {
  CustomFormResponseItem,
  EventParticipant,
} from "@/lib/takeout-api-types";
import { addToQueue } from "@/lib/takeout-queue";
import { Button } from "heroui-native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, type GestureResponderEvent } from "react-native";

import { Modal, Pressable, Text, View } from "@/lib/primitives";
import { useResponsiveScale } from "@/utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOCK_RENEW_INTERVAL_MS = 15_000;

function formatBirthDate(s: string | null | undefined): string {
  return formatDateBR(s);
}

function ageFromBirthDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
  ) {
    age--;
  }
  return age >= 0 ? String(age) : "—";
}

function formatResponseValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

type Props = {
  visible: boolean;
  participant: EventParticipant | null;
  onClose: () => void;
  onConfirmed: () => void;
  onQueuedOffline?: () => void;
  onConflict?: (ticketId: string) => void;
};

export function ConfirmTakeoutModal({
  visible,
  participant,
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
  const [lockState, setLockState] = useState<"heldByMe" | "heldByOther" | null>(
    null,
  );
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
    setError(null);
    setLoading(true);
    const requestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
    try {
      const res = await api.postTakeoutConfirm({
        request_id: requestId,
        ticket_id: participant.ticketId,
        device_id: deviceId,
      });
      if (res.status === "CONFIRMED" || res.status === "DUPLICATE") {
        if (participant && api && deviceId) {
          api.deleteLocksRelease(participant.id, deviceId).catch(() => {});
        }
        onConfirmed();
        onClose();
      } else {
        setError("Resposta inesperada: " + res.status);
      }
    } catch (e) {
      if (e instanceof TakeoutApiError && e.status === 409) {
        onClose();
        onConflict?.(participant.ticketId);
        Alert.alert("Conflito", "Check-in já realizado por outro dispositivo.");
        return;
      }
      try {
        await addToQueue({
          request_id: requestId,
          ticket_id: participant.ticketId,
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

  const isLockedByOther = lockState === "heldByOther";
  const canConfirm = !isLockedByOther;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center"
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingHorizontal: scale(16),
        }}
        onPress={handleClose}
      >
        <Pressable
          className="bg-background rounded-3xl"
          style={{
            padding: scale(24),
            width: "90%",
            maxWidth: width * 0.9,
          }}
          onPress={(e: GestureResponderEvent) => e.stopPropagation()}
        >
          <Text className="text-lg font-semibold text-foreground mb-4">
            Confirmar check-in
          </Text>
          {lockState === "heldByMe" ? (
            <Text className="text-muted-foreground text-sm mb-2">
              Em atendimento por você
            </Text>
          ) : isLockedByOther ? (
            <Text className="text-warning text-sm mb-2">
              Em atendimento por outro dispositivo
            </Text>
          ) : null}
          <View className="gap-2 mb-4">
            <Row label="Nome" value={participant.name ?? "—"} />
            <Row label="CPF" value={participant.cpf ?? "—"} />
            <Row
              label="Data de nascimento"
              value={formatBirthDate(participant.birthDate)}
            />
            <Row
              label="Idade"
              value={ageFromBirthDate(participant.birthDate)}
            />
            <Row
              label="Ingresso"
              value={participant.sourceTicketId ?? participant.ticketId}
            />
            <Row
              label="Tipo de ingresso"
              value={participant.ticketName ?? "—"}
            />
            <Row label="Valor pago" value="—" />
          </View>
          {participant.customFormResponses &&
          participant.customFormResponses.length > 0 ? (
            <View className="mb-4">
              <Text className="text-muted-foreground text-xs font-medium mb-2">
                Dados adicionais
              </Text>
              <View className="gap-2">
                {participant.customFormResponses.map(
                  (r: CustomFormResponseItem, i: number) => (
                    <Row
                      key={i}
                      label={r.label || r.name}
                      value={formatResponseValue(r.response)}
                    />
                  ),
                )}
              </View>
            </View>
          ) : null}
          {error ? (
            <Text className="text-danger text-sm mb-3">{error}</Text>
          ) : null}
          <View className="flex-row gap-3">
            <Button
              variant="bordered"
              className="px-4 py-3"
              onPress={handleClose}
              isDisabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="px-4 py-3"
              onPress={handleConfirm}
              isLoading={loading}
              isDisabled={loading || !canConfirm}
            >
              Confirmar check-in
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className="text-foreground text-sm">{value}</Text>
    </View>
  );
}
