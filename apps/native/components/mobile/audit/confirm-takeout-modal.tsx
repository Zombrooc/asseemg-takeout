import { Button, Card, Input } from "@/components/ui-tamagui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { formatDateOnlyBR, parseDateOnlyParts } from "@/lib/format-date";
import { TakeoutApiError } from "@/lib/takeout-api";
import type {
  CustomFormResponseItem,
  EventParticipant,
  ParticipantAlert,
} from "@/lib/takeout-api-types";
import {
  buildTakeoutRetirantePayload,
  buildTakeoutRetirantePayloadJson,
} from "@/lib/takeout-retirante-payload";
import { addToQueue } from "@/lib/takeout-queue";
import { secureOperationId } from "@/lib/takeout-identity";
import { metricNow, recordTakeoutMetric } from "@/lib/takeout-metrics";
import {
  getTakeoutModalParticipantDetails,
  type TakeoutModalParticipant,
  type TakeoutModalSourceType,
} from "@/components/mobile/audit/confirm-takeout-modal.data";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack, useTheme } from "tamagui";

const LOCK_RENEW_INTERVAL_MS = 15_000;

type SourceType = TakeoutModalSourceType;
type ModalParticipant = TakeoutModalParticipant;

type Props = {
  visible: boolean;
  participant: ModalParticipant | null;
  readOnly?: boolean;
  alerts?: ParticipantAlert[];
  sourceType?: SourceType;
  eventId?: string;
  onClose: () => void;
  onConfirmed: () => void;
  onQueuedOffline?: () => void;
  onConflict?: (ticketId: string) => void;
};

function formatBirthDate(s: string | null | undefined): string {
  return formatDateOnlyBR(s);
}

export function getParticipantBirthDate(participant: ModalParticipant): string | null {
  const raw = participant as ModalParticipant & {
    birth_date?: string | null;
    dataNascimento?: string | null;
  };
  const value = participant.birthDate ?? raw.birth_date ?? raw.dataNascimento ?? null;
  const parts = parseDateOnlyParts(value);
  if (!parts) return null;
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

function ageFromBirthDate(s: string | null | undefined): string {
  if (!s) return "-";
  const birthDate = parseDateOnlyParts(s);
  if (!birthDate) return "-";
  const now = new Date();
  let age = now.getFullYear() - birthDate.year;
  if (
    now.getMonth() + 1 < birthDate.month ||
    (now.getMonth() + 1 === birthDate.month && now.getDate() < birthDate.day)
  ) {
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

export function ConfirmTakeoutModal({
  visible,
  participant,
  readOnly = false,
  alerts = [],
  sourceType = "json_sync",
  eventId,
  onClose,
  onConfirmed,
  onQueuedOffline,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const closeIconColor = theme.foreground.get();
  const { api, deviceId, isReachable } = useTakeoutConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProxyTakeout, setIsProxyTakeout] = useState(false);
  const [retiranteNome, setRetiranteNome] = useState("");
  const [retiranteCpf, setRetiranteCpf] = useState("");
  const [lockState, setLockState] = useState<"heldByMe" | "heldByOther" | null>(null);
  const renewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  const participantId = participant?.id;

  useEffect(() => {
    if (!visible || !participantId) return;
    setError(null);
    setLoading(false);
    submittingRef.current = false;
    setIsProxyTakeout(false);
    setRetiranteNome("");
    setRetiranteCpf("");
  }, [visible, participantId]);

  useEffect(() => {
    if (readOnly || !visible || !participantId || !api || !deviceId) {
      setLockState(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await api.postLocksAcquire(participantId, deviceId);
        if (cancelled) return;
        setLockState("heldByMe");
        renewIntervalRef.current = setInterval(() => {
          api.postLocksRenew(participantId, deviceId).catch(() => {});
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
      if (api && deviceId) {
        api.deleteLocksRelease(participantId, deviceId).catch(() => {});
      }
    };
  }, [visible, participantId, api, deviceId, readOnly]);

  const handleClose = () => {
    if (loading || submittingRef.current) return;
    if (participantId && api && deviceId && lockState === "heldByMe") {
      api.deleteLocksRelease(participantId, deviceId).catch(() => {});
    }
    setLockState(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    if (readOnly || !participant || !deviceId) return;
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
    submittingRef.current = true;
    setLoading(true);
    let requestId: string;
    try {
      requestId = secureOperationId();
    } catch {
      setError("Este dispositivo não oferece geração segura de identificadores.");
      submittingRef.current = false;
      setLoading(false);
      return;
    }

    try {
      // The durable local transaction is the only awaited confirmation step.
      // Transport acknowledgement is reconciled by TakeoutQueueProcessor.
      const commitStartedAt = metricNow();
      await addToQueue({
        request_id: requestId,
        ticket_id: sourceType === "legacy_csv" ? participant.id : (participant as EventParticipant).ticketId,
        participant_id: participant.id,
        event_id: eventId,
        source_type: sourceType,
        device_id: deviceId,
        payload_json: proxyPayloadJson,
      });
      recordTakeoutMetric("local_commit_ms", metricNow() - commitStartedAt);
      api?.deleteLocksRelease(participant.id, deviceId).catch(() => {});
      if (!isReachable) onQueuedOffline?.();
      onConfirmed();
      onClose();
    } catch {
      // Never claim success when the local transaction could not be committed.
      setError("Não foi possível registrar a retirada neste dispositivo.");
      submittingRef.current = false;
      setLoading(false);
    } finally {
      if (submittingRef.current) {
        submittingRef.current = false;
        setLoading(false);
      }
    }
  };

  if (!participant) return null;

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
  const birthDate = getParticipantBirthDate(participant);
  const {
    name: participantName,
    cpf: participantCpf,
    ticketType,
    shirtSize,
    bibNumber,
    ticketIdentifier,
    team,
  } = getTakeoutModalParticipantDetails(participant, sourceType);
  const serviceLabel = readOnly
    ? "Atendimento concluído"
    : isLockedByOther
      ? "Em atendimento por outro dispositivo"
      : lockState === "heldByMe"
        ? "Em atendimento por você"
        : "Validando atendimento";
  const statusLabel = readOnly
    ? "CHECK-IN REALIZADO"
    : isLockedByOther
      ? "ATENDIMENTO INDISPONÍVEL"
      : lockState === "heldByMe"
        ? "CHECK-IN PENDENTE"
        : "VALIDANDO ATENDIMENTO";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <YStack flex={1} backgroundColor="$background">
          <Pressable
            accessibilityLabel="Fechar conferência"
            onPress={handleClose}
            style={{
              ...({ position: "absolute", inset: 0 } as const),
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          />

          <YStack
            flex={1}
            backgroundColor="$background"
            accessibilityViewIsModal
            style={{ width: "100%", maxWidth: 640, alignSelf: "center" }}
          >
            <YStack
              borderBottomWidth={1}
              borderColor="$border"
              backgroundColor="$background"
              style={{ paddingTop: insets.top }}
            >
              <XStack gap="$2" style={{ paddingHorizontal: 12, paddingVertical: 8, alignItems: "flex-start" }}>
                <Pressable
                  testID="takeout-confirm-modal-close"
                  accessibilityRole="button"
                  accessibilityLabel="Fechar conferência"
                  onPress={handleClose}
                  disabled={loading}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading ? 0.5 : pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="close" size={26} color={closeIconColor} />
                </Pressable>
                <YStack flex={1} gap="$1" style={{ paddingTop: 4 }}>
                  <Text
                    accessibilityRole="header"
                    accessibilityHint={readOnly ? "Dados do participante" : "Confirmar check-in"}
                    fontSize={23}
                    fontWeight="800"
                    color="$foreground"
                  >
                    Conferência do kit
                  </Text>
                  <Text color="$textSecondary" fontSize={14}>
                    Confira antes de entregar ao participante
                  </Text>
                </YStack>
              </XStack>
              <XStack gap="$2" style={{ paddingHorizontal: 16, paddingBottom: 12, alignItems: "center" }}>
                <StatusChip label={serviceLabel} tone={isLockedByOther ? "warning" : "neutral"} />
                <StatusChip label={statusLabel} tone={readOnly ? "success" : isLockedByOther ? "danger" : "accent"} />
              </XStack>
            </YStack>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 20 }}
            >
              {alerts.length > 0 ? (
                <YStack
                  testID="takeout-confirm-modal-alerts"
                  gap="$2"
                  borderWidth={1}
                  borderColor="$danger"
                  backgroundColor="$card"
                  accessibilityRole="alert"
                  style={{ padding: 12, borderRadius: 16 }}
                >
                  <Text color="$danger" fontSize={14} fontWeight="700">
                    Alertas para este participante
                  </Text>
                  {alerts.map((alert) => (
                    <Text
                      key={`${participant.id}-${alert.code}-${alert.message}`}
                      color="$danger"
                      fontSize={13}
                    >
                      {alert.message}
                    </Text>
                  ))}
                </YStack>
              ) : null}

              <Card
                backgroundColor="$card"
                borderColor="$border"
                testID="takeout-confirm-modal-participant"
                style={{ padding: 16, borderRadius: 20 }}
              >
                <Text color="$textSecondary" fontSize={12} fontWeight="700">
                  Nome do participante
                </Text>
                <Text
                  selectable
                  color="$foreground"
                  fontSize={24}
                  lineHeight={29}
                  fontWeight="800"
                  style={{ marginTop: 4 }}
                >
                  {participantName}
                </Text>
                <XStack gap="$2" borderTopWidth={1} borderColor="$border" style={{ marginTop: 12, paddingTop: 12 }}>
                  <Text color="$textSecondary" fontSize={13} fontWeight="700">
                    CPF
                  </Text>
                  <Text selectable color="$foreground" fontSize={15} fontWeight="600" flex={1}>
                    {participantCpf}
                  </Text>
                </XStack>
              </Card>

              <YStack gap="$3">
                <SectionTitle>Conferir no kit físico</SectionTitle>
                  <XStack
                    testID="takeout-confirm-modal-kit-cards"
                    gap="$2"
                  style={{ alignItems: "stretch" }}
                >
                  <KitCard label="Ingresso" value={ticketType} />
                  <KitCard label="Tamanho da camisa" value={shirtSize} />
                  <KitCard label="Número de peito" value={bibNumber} />
                </XStack>
              </YStack>

              <YStack gap="$3">
                <SectionTitle>Dados do participante</SectionTitle>
                <YStack borderWidth={1} borderColor="$border" overflow="hidden" backgroundColor="$card" style={{ borderRadius: 16 }}>
                  <Row label="Data de nascimento" value={formatBirthDate(birthDate)} />
                  <Row label="Idade" value={ageFromBirthDate(birthDate)} />
                  <Row label="Equipe" value={team} isLast={!current} />
                  {current ? <Row label="Identificação do ingresso" value={ticketIdentifier} isLast /> : null}
                </YStack>
              </YStack>

              {current?.customFormResponses && current.customFormResponses.length > 0 ? (
                <YStack gap="$3">
                  <SectionTitle>Dados adicionais</SectionTitle>
                  <YStack borderWidth={1} borderColor="$border" overflow="hidden" backgroundColor="$card" style={{ borderRadius: 16 }}>
                    {current.customFormResponses.map((r: CustomFormResponseItem, i: number) => (
                      <Row
                        key={`${r.name}-${i}`}
                        label={r.label || r.name}
                        value={formatResponseValue(r.response)}
                        isLast={i === (current.customFormResponses?.length ?? 0) - 1}
                      />
                    ))}
                  </YStack>
                </YStack>
              ) : null}

              <YStack gap="$3">
                <SectionTitle>Retirante</SectionTitle>
                <Card gap="$3" backgroundColor="$card" borderColor="$border" style={{ padding: 16 }}>
                  {readOnly ? (
                    <Text color="$textSecondary" fontSize={14}>
                      A retirada já foi confirmada. Consulte o histórico de auditoria para os dados do retirante.
                    </Text>
                  ) : (
                    <>
                      <XStack gap="$3" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Text color="$textSecondary" fontSize={14} fontWeight="700" flex={1}>
                          Retirada por terceiro
                        </Text>
                        <Text color={isProxyTakeout ? "$warning" : "$foreground"} fontSize={15} fontWeight="800">
                          {isProxyTakeout ? "Sim" : "Não"}
                        </Text>
                      </XStack>
                      <XStack gap="$2" accessibilityRole="radiogroup" accessibilityLabel="Quem está retirando o kit?">
                        <Button
                          testID="takeout-confirm-modal-own-toggle"
                          flex={1}
                          style={{ minHeight: 48 }}
                          variant={!isProxyTakeout ? "primary" : "outline"}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: !isProxyTakeout, disabled: loading }}
                          onPress={() => setIsProxyTakeout(false)}
                          isDisabled={loading}
                        >
                          Próprio atleta
                        </Button>
                        <Button
                          testID="takeout-confirm-modal-proxy-toggle"
                          flex={1}
                          style={{ minHeight: 48 }}
                          variant={isProxyTakeout ? "primary" : "outline"}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isProxyTakeout, disabled: loading }}
                          onPress={() => setIsProxyTakeout(true)}
                          isDisabled={loading}
                        >
                          Outra pessoa
                        </Button>
                      </XStack>
                      <Text color="$textSecondary" fontSize={13}>
                        {isProxyTakeout ? "Retirante: uma terceira pessoa." : "Retirante: o próprio atleta."}
                      </Text>
                      {!readOnly ? (
                        isProxyTakeout ? (
                          <YStack gap="$2">
                            <Text color="$textSecondary" fontSize={13} fontWeight="700">
                              Nome completo do retirante *
                            </Text>
                            <Input
                              testID="takeout-confirm-modal-retirante-nome"
                              accessibilityLabel="Nome completo do retirante"
                              value={retiranteNome}
                              onChangeText={setRetiranteNome}
                              placeholder="Nome de quem está retirando"
                              autoCapitalize="words"
                              editable={!loading}
                            />
                            <Text color="$textSecondary" fontSize={13} fontWeight="700">
                              CPF do retirante (opcional)
                            </Text>
                            <Input
                              testID="takeout-confirm-modal-retirante-cpf"
                              accessibilityLabel="CPF do retirante"
                              value={retiranteCpf}
                              onChangeText={setRetiranteCpf}
                              placeholder="000.000.000-00"
                              keyboardType="number-pad"
                              editable={!loading}
                            />
                            {!isRetiranteNomeValid ? (
                              <Text color="$danger" fontSize={12} accessibilityRole="alert">
                                Nome do retirante e obrigatorio.
                              </Text>
                            ) : null}
                          </YStack>
                        ) : null
                      ) : null}
                    </>
                  )}
                </Card>
              </YStack>
            </ScrollView>

            <YStack
              borderTopWidth={1}
              borderColor="$border"
              backgroundColor="$background"
              gap="$2"
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: Math.max(insets.bottom, 12),
              }}
            >
              {error ? (
                <Text color="$danger" fontSize={14} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              <XStack gap="$2">
                <Button
                  testID="takeout-confirm-modal-cancel"
                  flex={readOnly ? 1 : 0.38}
                  style={{ minHeight: 52 }}
                  variant="bordered"
                  onPress={handleClose}
                  isDisabled={loading}
                >
                  Cancelar
                </Button>
                {!readOnly ? (
                  <Button
                    testID="takeout-confirm-modal-confirm"
                    flex={1}
                    style={{ minHeight: 52 }}
                    onPress={handleConfirm}
                    isLoading={loading}
                    isDisabled={loading || !canConfirm}
                    accessibilityLabel="Confirmar check-in"
                  >
                    Confirmar check-in
                  </Button>
                ) : null}
              </XStack>
            </YStack>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text color="$foreground" fontSize={16} fontWeight="800">
      {children}
    </Text>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "neutral" | "accent" | "warning" | "danger" | "success" }) {
  const color = tone === "danger" ? "$danger" : tone === "warning" ? "$warning" : tone === "success" ? "$success" : tone === "accent" ? "$accent" : "$textSecondary";
  return (
    <YStack borderWidth={1} borderColor={color} style={{ flexShrink: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
      <Text color={color} fontSize={11} fontWeight="800" numberOfLines={2}>
        {label}
      </Text>
    </YStack>
  );
}

function KitCard({ label, value }: { label: string; value: string }) {
  return (
    <Card
      testID={`takeout-confirm-modal-kit-${label.toLowerCase().replaceAll(" ", "-")}`}
      flex={1}
      gap="$2"
      backgroundColor="$card"
      borderColor="$border"
      style={{ minWidth: 0, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 16 }}
    >
      <Text color="$textSecondary" fontSize={11} lineHeight={14} fontWeight="700">
        {label}
      </Text>
      <Text
        selectable
        color="$foreground"
        fontSize={20}
        lineHeight={24}
        fontWeight="800"
        accessibilityLabel={`${label}: ${value}`}
        style={{ flexShrink: 1 }}
      >
        {value}
      </Text>
    </Card>
  );
}

function Row({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <XStack
      gap="$3"
      borderBottomWidth={isLast ? 0 : 1}
      borderColor="$border"
      style={{ paddingHorizontal: 16, paddingVertical: 12, alignItems: "flex-start" }}
    >
      <Text color="$textSecondary" fontSize={14} flex={1}>
        {label}
      </Text>
      <Text selectable color="$foreground" fontSize={14} fontWeight="600" flex={1} style={{ textAlign: "right" }}>
        {value}
      </Text>
    </XStack>
  );
}
