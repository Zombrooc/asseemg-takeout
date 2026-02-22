import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { formatDateBR } from "@/lib/format-date";
import type { CustomFormResponseItem, EventParticipant } from "@/lib/takeout-api-types";
import { addToQueue } from "@/lib/takeout-queue";
import { Button } from "heroui-native";
import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

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

type Props = {
  visible: boolean;
  participant: EventParticipant | null;
  onClose: () => void;
  onConfirmed: () => void;
  onQueuedOffline?: () => void;
};

export function ConfirmTakeoutModal({ visible, participant, onClose, onConfirmed, onQueuedOffline }: Props) {
  const { api, deviceId } = useTakeoutConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!participant || !api || !deviceId) return;
    setError(null);
    setLoading(true);
    const requestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    try {
      const res = await api.postTakeoutConfirm({
        request_id: requestId,
        ticket_id: participant.ticketId,
        device_id: deviceId,
      });
      if (res.status === "CONFIRMED" || res.status === "DUPLICATE") {
        onConfirmed();
        onClose();
      } else {
        setError("Resposta inesperada: " + res.status);
      }
    } catch {
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable className="flex-1 bg-black/50 justify-center items-center p-4" onPress={onClose}>
        <Pressable className="p-6 bg-background rounded-xl min-w-[280px]" onPress={(e) => e.stopPropagation()}>
        <Text className="text-lg font-semibold text-foreground mb-4">Confirmar check-in</Text>
        <View className="gap-2 mb-4">
          <Row label="Nome" value={participant.name ?? "—"} />
          <Row label="CPF" value={participant.cpf ?? "—"} />
          <Row label="Data de nascimento" value={formatBirthDate(participant.birthDate)} />
          <Row label="Idade" value={ageFromBirthDate(participant.birthDate)} />
          <Row label="Ingresso" value={participant.ticketId} />
          <Row label="Tipo de ingresso" value={participant.ticketName ?? "—"} />
          <Row label="Valor pago" value="—" />
        </View>
        {participant.customFormResponses && participant.customFormResponses.length > 0 ? (
          <View className="mb-4">
            <Text className="text-muted-foreground text-xs font-medium mb-2">Dados adicionais</Text>
            <View className="gap-2">
              {participant.customFormResponses.map((r: CustomFormResponseItem, i: number) => (
                <Row
                  key={i}
                  label={r.label || r.name}
                  value={formatResponseValue(r.response)}
                />
              ))}
            </View>
          </View>
        ) : null}
        {error ? <Text className="text-danger text-sm mb-3">{error}</Text> : null}
        <View className="flex-row gap-3">
          <Button variant="bordered" onPress={onClose} isDisabled={loading}>
            Cancelar
          </Button>
          <Button onPress={handleConfirm} isLoading={loading} isDisabled={loading}>
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
