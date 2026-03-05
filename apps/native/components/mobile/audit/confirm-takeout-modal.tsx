import { Button, Card, Input } from "@/components/ui-tamagui";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { formatDateBR } from "@/lib/format-date";
import { TakeoutApiError } from "@/lib/takeout-api";
import type {
  CustomFormResponseItem,
  EventParticipant,
  LegacyEventParticipant,
} from "@/lib/takeout-api-types";
import {
  buildTakeoutRetirantePayload,
  buildTakeoutRetirantePayloadJson,
} from "@/lib/takeout-retirante-payload";
import { addToQueue } from "@/lib/takeout-queue";
import { useResponsiveScale } from "@/utils/responsive";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  type GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  type KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";
import { getConfirmTakeoutModalLayout } from "@/components/mobile/audit/confirm-takeout-modal.layout";

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
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
    age--;
  }
  return age >= 0 ? String(age) : "-";
}

function formatResponseValue(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  try {
    return JSON.stringify(value);
  } catch {
    return "-";
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
  const { height: windowHeight } = useWindowDimensions();
  const { api, deviceId } = useTakeoutConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProxyTakeout, setIsProxyTakeout] = useState(false);
  const [retiranteNome, setRetiranteNome] = useState("");
  const [retiranteCpf, setRetiranteCpf] = useState("");
  const [lockState, setLockState] = useState<"heldByMe" | "heldByOther" | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const renewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setIsProxyTakeout(false);
    setRetiranteNome("");
    setRetiranteCpf("");
  }, [visible, participant?.id]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      return;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

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
    // #region agent log
    fetch("http://127.0.0.1:7496/ingest/1028bdca-7037-4a64-896c-a6cc5ba2298a", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a61d58",
      },
      body: JSON.stringify({
        sessionId: "a61d58",
        runId: "initial",
        hypothesisId: "syntax_or_runtime",
        location: "confirm-takeout-modal.tsx:handleConfirm",
        message: "ConfirmTakeoutModal handleConfirm called",
        data: {
          participantId: participant?.id ?? null,
          sourceType,
          deviceId: deviceId ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!participant || !api || !deviceId) return;
    if (sourceType === "legacy_csv" && !eventId) {
      setError("Event ID ausente para confirmacao legado.");
      return;
    }

    const proxyPayload = buildTakeoutRetirantePayload({
      isProxyTakeout,
      retiranteNome,
      retiranteCpf,
    });
    if (isProxyTakeout && !proxyPayload) {
      setError("Informe o nome do retirante.");
      return;
    }

    const proxyPayloadJson = buildTakeoutRetirantePayloadJson({
      isProxyTakeout,
      retiranteNome,
      retiranteCpf,
    });

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
              payload_json: proxyPayloadJson,
            })
          : await api.postTakeoutConfirm({
              request_id: requestId,
              ticket_id: (participant as EventParticipant).ticketId,
              device_id: deviceId,
              payload_json: proxyPayloadJson,
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
        Alert.alert("Conflito", "Check-in ja realizado por outro dispositivo.");
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
          payload_json: proxyPayloadJson,
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
  const isRetiranteNomeValid =
    !isProxyTakeout ||
    buildTakeoutRetirantePayload({
      isProxyTakeout,
      retiranteNome,
      retiranteCpf,
    }) != null;
  const canConfirm = !isLockedByOther && isRetiranteNomeValid;
  const modalLayout = getConfirmTakeoutModalLayout({
    windowHeight,
    keyboardHeight,
    isKeyboardVisible,
    insets: { top: insets.top, bottom: insets.bottom },
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: modalLayout.justifyContent,
              alignItems: "center",
              paddingTop: modalLayout.paddingTop,
              paddingBottom: modalLayout.paddingBottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
              paddingHorizontal: scale(16),
            }}
          >
            <Pressable
              style={{ width: "90%", maxWidth: width * 0.9, maxHeight: modalLayout.cardMaxHeight }}
              onPress={(e: GestureResponderEvent) => e.stopPropagation()}
            >
              <Card style={{ padding: 24 }}>
                <Text fontSize={18} fontWeight="600" color="$foreground">
                  Confirmar check-in
                </Text>
                {lockState === "heldByMe" ? (
                  <Text color="$textSecondary" fontSize={14}>
                    Em atendimento por voce
                  </Text>
                ) : isLockedByOther ? (
                  <Text color="$warning" fontSize={14}>
                    Em atendimento por outro dispositivo
                  </Text>
                ) : null}
                <YStack gap="$2" style={{ marginBottom: 16 }}>
                  <Row label="Nome" value={(legacy?.name ?? current?.name) ?? "-"} />
                  <Row label="CPF" value={(legacy?.cpf ?? current?.cpf) ?? "-"} />
                  <Row label="Data de nascimento" value={formatBirthDate(legacy?.birthDate ?? current?.birthDate)} />
                  <Row label="Idade" value={ageFromBirthDate(legacy?.birthDate ?? current?.birthDate)} />
                  <Row
                    label="Ingresso"
                    value={
                      legacy != null ? `#${legacy.bibNumber}` : ((current?.sourceTicketId ?? current?.ticketId) ?? "-")
                    }
                  />
                  <Row label="Tipo de ingresso" value={(legacy?.modality ?? current?.ticketName) ?? "-"} />
                  <Row label="Tamanho da camisa" value={legacy?.shirtSize ?? "-"} />
                  <Row label="Equipe" value={legacy?.team ?? "-"} />
                </YStack>
                {current?.customFormResponses && current.customFormResponses.length > 0 ? (
                  <YStack gap="$2" style={{ marginBottom: 16 }}>
                    <Text color="$textSecondary" fontSize={12} fontWeight="500">
                      Dados adicionais
                    </Text>
                    <YStack gap="$2">
                      {current.customFormResponses.map((r: CustomFormResponseItem, i: number) => (
                        <Row key={i} label={r.label || r.name} value={formatResponseValue(r.response)} />
                      ))}
                    </YStack>
                  </YStack>
                ) : null}
                <YStack gap="$2" style={{ marginBottom: 16 }}>
                  <Text color="$textSecondary" fontSize={12} fontWeight="500">
                    Retirante
                  </Text>
                  <Button
                    testID="takeout-confirm-modal-proxy-toggle"
                    variant={isProxyTakeout ? "secondary" : "bordered"}
                    onPress={() => setIsProxyTakeout((prev) => !prev)}
                    isDisabled={loading}
                  >
                    {isProxyTakeout ? "Retirada por terceiro: Sim" : "Retirada por terceiro: Nao"}
                  </Button>
                  {isProxyTakeout ? (
                    <YStack gap="$2">
                      <Input
                        testID="takeout-confirm-modal-retirante-nome"
                        value={retiranteNome}
                        onChangeText={setRetiranteNome}
                        placeholder="Nome do retirante"
                        autoCapitalize="words"
                        editable={!loading}
                      />
                      <Input
                        testID="takeout-confirm-modal-retirante-cpf"
                        value={retiranteCpf}
                        onChangeText={setRetiranteCpf}
                        placeholder="CPF do retirante (opcional)"
                        keyboardType="number-pad"
                        editable={!loading}
                      />
                      {!isRetiranteNomeValid ? (
                        <Text color="$danger" fontSize={12}>
                          Nome do retirante e obrigatorio.
                        </Text>
                      ) : null}
                    </YStack>
                  ) : null}
                </YStack>
                {error ? (
                  <Text color="$danger" fontSize={14}>
                    {error}
                  </Text>
                ) : null}
                <XStack gap="$3">
                  <Button
                    testID="takeout-confirm-modal-cancel"
                    variant="bordered"
                    onPress={handleClose}
                    isDisabled={loading}
                  >
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
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <XStack style={{ justifyContent: "space-between" }}>
      <Text color="$textSecondary" fontSize={14}>
        {label}
      </Text>
      <Text color="$foreground" fontSize={14}>
        {value}
      </Text>
    </XStack>
  );
}
