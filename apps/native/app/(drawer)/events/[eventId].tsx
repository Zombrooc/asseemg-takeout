import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import type { EventParticipant } from "@/lib/takeout-api-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler } from "react-native";

import { FlatList, Pressable, Text, View } from "@/lib/primitives";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Surface, Spinner } from "heroui-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Container } from "@/components/container";
import { ConfirmTakeoutModal } from "@/components/takeout/confirm-takeout-modal";
import { ParticipantListItem } from "@/components/takeout/participant-list-item";
import { formatDateBR } from "@/lib/format-date";
import { useTakeoutRealtime } from "@/lib/takeout-realtime";
import { getPendingQueue } from "@/lib/takeout-queue";
import { useResponsiveScale } from "@/utils/responsive";

const SYNC_LAST_SEQ_KEY = (eventId: string) =>
  `takeout_sync_last_seq_${eventId}`;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function matchesSearch(participant: EventParticipant, q: string): boolean {
  const nq = normalize(q);
  if (!nq) return true;
  const inStr = (val: string | null | undefined) =>
    val != null && normalize(String(val)).includes(nq);
  return (
    inStr(participant.name) ||
    inStr(participant.cpf) ||
    inStr(participant.birthDate ?? null) ||
    inStr(participant.sourceTicketId ?? null) ||
    inStr(participant.ticketId) ||
    inStr(participant.qrCode)
  );
}

const PENDING_QUEUE_KEY = ["takeout-pending-queue"] as const;

const EmptyList = memo(function EmptyList() {
  return (
    <Text className="text-muted-foreground text-center py-8">
      Nenhum participante.
    </Text>
  );
});

export default function EventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { scale } = useResponsiveScale();
  const { api, isReachable, checkReachability, baseUrl, deviceId } =
    useTakeoutConnection();
  const { lockMap } = useTakeoutRealtime(
    eventId ?? undefined,
    baseUrl,
    deviceId,
  );

  useEffect(() => {
    if (!api || !eventId || !isReachable) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SYNC_LAST_SEQ_KEY(eventId));
        const sinceSeq = raw != null ? Number(raw) : 0;
        const { events, latestSeq } = await api.getSyncEvents(
          eventId,
          sinceSeq,
        );
        if (cancelled) return;
        if (events.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
          queryClient.invalidateQueries({
            queryKey: ["takeout-event-participants", eventId],
          });
        }
        await AsyncStorage.setItem(
          SYNC_LAST_SEQ_KEY(eventId),
          String(latestSeq),
        );
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, eventId, isReachable, queryClient]);

  const [selectedParticipant, setSelectedParticipant] =
    useState<EventParticipant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [offlineNoticeVisible, setOfflineNoticeVisible] = useState(false);
  const [conflictTicketIds, setConflictTicketIds] = useState<Set<string>>(
    new Set(),
  );
  const [permission, requestPermission] = useCameraPermissions();

  const eventQuery = useQuery({
    queryKey: ["takeout-events"],
    queryFn: () =>
      api ? api.getEvents() : Promise.reject(new Error("No API")),
    enabled: !!api && isReachable,
  });

  const participantsQuery = useQuery({
    queryKey: ["takeout-event-participants", eventId],
    queryFn: () =>
      api && eventId
        ? api.getEventParticipants(eventId)
        : Promise.reject(new Error("No API")),
    enabled: !!api && !!eventId && isReachable,
  });

  const auditQuery = useQuery({
    queryKey: ["takeout-audit"],
    queryFn: () => (api ? api.getAudit() : Promise.reject(new Error("No API"))),
    enabled: !!api && !!eventId && isReachable,
  });

  const pendingQueueQuery = useQuery({
    queryKey: PENDING_QUEUE_KEY,
    queryFn: getPendingQueue,
    refetchInterval: isReachable ? 5000 : false,
  });

  const pendingTicketIds = useMemo(
    () => new Set((pendingQueueQuery.data ?? []).map((i) => i.ticket_id)),
    [pendingQueueQuery.data],
  );

  const event = useMemo(
    () => eventQuery.data?.find((e) => e.eventId === eventId) ?? null,
    [eventQuery.data, eventId],
  );

  useEffect(() => {
    if (event?.name) {
      navigation.setOptions({ headerTitle: event.name });
    }
  }, [event?.name, navigation]);

  useEffect(() => {
    if (!showQrScanner) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowQrScanner(false);
      return true;
    });
    return () => sub.remove();
  }, [showQrScanner]);

  const insets = useSafeAreaInsets();
  const participants = participantsQuery.data ?? [];
  const participantsById = useMemo(
    () =>
      new Map(participants.map((participant) => [participant.id, participant])),
    [participants],
  );
  const filteredParticipants = useMemo(
    () => participants.filter((p) => matchesSearch(p, searchQuery)),
    [participants, searchQuery],
  );

  const auditConfirmedTicketIds = useMemo(
    () =>
      new Set(
        (auditQuery.data ?? [])
          .filter((a) => a.status === "CONFIRMED" || a.status === "DUPLICATE")
          .map((a) => a.ticket_id),
      ),
    [auditQuery.data],
  );

  useEffect(() => {
    if (!auditQuery.data?.length) return;
    setConflictTicketIds((prev) => {
      const next = new Set(prev);
      auditQuery.data?.forEach((a) => {
        if (a.status === "CONFIRMED" || a.status === "DUPLICATE")
          next.delete(a.ticket_id);
      });
      return next;
    });
  }, [auditQuery.data]);

  const total = participants.length;
  const confirmed = participants.filter((p) =>
    auditConfirmedTicketIds.has(p.ticketId),
  ).length;
  const pending = total - confirmed;

  const onQrScanned = useCallback(
    ({ data }: { data: string }) => {
      const code = data.trim();
      const participant = participants.find(
        (p) =>
          p.ticketId === code ||
          p.qrCode === code ||
          p.ticketId.trim() === code ||
          p.qrCode.trim() === code,
      );
      setShowQrScanner(false);
      if (!participant) {
        Alert.alert(
          "Ingresso não encontrado",
          "Ingresso não encontrado neste evento.",
        );
        return;
      }
      if (auditConfirmedTicketIds.has(participant.ticketId)) {
        Alert.alert(
          "Check-in já realizado",
          "Este ingresso já teve check-in realizado.",
        );
        return;
      }
      if (
        deviceId != null &&
        lockMap[participant.id] != null &&
        lockMap[participant.id] !== deviceId
      ) {
        Alert.alert(
          "Em atendimento",
          "Este participante está sendo atendido por outro dispositivo. Aguarde para fazer o check-in.",
        );
        return;
      }
      setSelectedParticipant(participant);
    },
    [participants, auditConfirmedTicketIds, lockMap, deviceId],
  );

  const offlineNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleQueuedOffline = useCallback(() => {
    setOfflineNoticeVisible(true);
    queryClient.invalidateQueries({ queryKey: PENDING_QUEUE_KEY });
    if (offlineNoticeTimeoutRef.current)
      clearTimeout(offlineNoticeTimeoutRef.current);
    offlineNoticeTimeoutRef.current = setTimeout(() => {
      setOfflineNoticeVisible(false);
      offlineNoticeTimeoutRef.current = null;
    }, 3500);
  }, [queryClient]);

  useEffect(() => {
    return () => {
      if (offlineNoticeTimeoutRef.current)
        clearTimeout(offlineNoticeTimeoutRef.current);
    };
  }, []);

  const handleResetCheckins = useCallback(async () => {
    if (!api || !eventId) return;
    setResetLoading(true);
    try {
      await api.postResetEventCheckins(eventId);
      await Promise.all([auditQuery.refetch(), participantsQuery.refetch()]);
    } catch (e) {
      Alert.alert(
        "Erro",
        e instanceof Error ? e.message : "Falha ao desfazer check-ins.",
      );
    } finally {
      setResetLoading(false);
    }
  }, [api, eventId, auditQuery, participantsQuery]);

  const handlePrimaryAction = useCallback(
    (participantId: string) => {
      const participant = participantsById.get(participantId);
      if (!participant) return;
      setSelectedParticipant(participant);
    },
    [participantsById],
  );

  const handleDismissConflict = useCallback((ticketId: string) => {
    setConflictTicketIds((prev) => {
      const next = new Set(prev);
      next.delete(ticketId);
      return next;
    });
  }, []);

  const handleConfirmed = useCallback(() => {
    setSelectedParticipant(null);
    participantsQuery.refetch();
    auditQuery.refetch();
  }, [participantsQuery, auditQuery]);

  const handleConflict = useCallback(
    (ticketId: string) => {
      setConflictTicketIds((prev) => new Set(prev).add(ticketId));
      auditQuery.refetch();
    },
    [auditQuery],
  );

  const renderItem = useCallback(
    ({ item }: { item: EventParticipant }) => {
      const isConfirmed = auditConfirmedTicketIds.has(item.ticketId);
      const isPendingSync = pendingTicketIds.has(item.ticketId);
      const isConflict = conflictTicketIds.has(item.ticketId);
      const lockedByOther =
        deviceId != null &&
        lockMap[item.id] != null &&
        lockMap[item.id] !== deviceId;

      return (
        <ParticipantListItem
          id={item.id}
          ticketId={item.ticketId}
          name={item.name}
          ticketLabel={item.sourceTicketId ?? item.ticketId}
          isConfirmed={isConfirmed}
          isPendingSync={isPendingSync}
          isConflict={isConflict}
          lockedByOther={lockedByOther}
          onPrimaryAction={handlePrimaryAction}
          onDismissConflict={handleDismissConflict}
        />
      );
    },
    [
      auditConfirmedTicketIds,
      pendingTicketIds,
      conflictTicketIds,
      lockMap,
      deviceId,
      handlePrimaryAction,
      handleDismissConflict,
    ],
  );

  if (!eventId) {
    return (
      <Container>
        <Text className="text-muted-foreground">Evento não encontrado.</Text>
      </Container>
    );
  }

  if (showQrScanner) {
    if (!permission) {
      return (
        <Container className="px-4 py-6">
          <Text className="text-muted-foreground">
            Verificando permissão da câmera...
          </Text>
        </Container>
      );
    }

    if (!permission.granted) {
      return (
        <Container className="px-4 py-6">
          <Text className="text-foreground font-medium mb-2">
            Acesso à câmera
          </Text>
          <Text className="text-muted-foreground text-sm mb-4">
            Necessário para escanear o QR do ingresso.
          </Text>
          <Button onPress={requestPermission}>Permitir câmera</Button>
          <Button
            variant="bordered"
            className="mt-3"
            onPress={() => setShowQrScanner(false)}
          >
            Voltar
          </Button>
        </Container>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <View
          className="absolute top-0 left-0 right-0 flex-row items-center bg-black/70"
          style={{
            paddingTop: insets.top,
            paddingBottom: scale(12),
            paddingHorizontal: scale(8),
          }}
        >
          <Pressable
            onPress={() => setShowQrScanner(false)}
            hitSlop={{
              top: scale(16),
              bottom: scale(16),
              left: scale(16),
              right: scale(16),
            }}
            className="justify-center pr-2"
            style={{ minHeight: scale(44), minWidth: scale(44) }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text
            className="flex-1 text-center text-white font-medium"
            numberOfLines={1}
          >
            Escanear ingresso
          </Text>
          <View style={{ minWidth: scale(44) }} />
        </View>

        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"], interval: 500 }}
          onBarcodeScanned={onQrScanned}
        />

        <View
          className="absolute bottom-0 left-0 right-0 bg-black/70"
          style={{
            padding: scale(16),
            paddingBottom: scale(16) + insets.bottom,
          }}
        >
          <Text className="text-white text-center text-sm mb-2">
            Aponte para o QR code do ingresso
          </Text>
          <Button
            variant="bordered"
            className="px-4 py-3"
            onPress={() => setShowQrScanner(false)}
          >
            Cancelar
          </Button>
        </View>
      </View>
    );
  }

  return (
    <>
      <Container isScrollable={false} className="flex-1">
        {event ? (
          <View className="px-4 pt-2 pb-3 border-b border-border">
            <Text className="text-lg font-semibold text-foreground">
              {event.name ?? eventId}
            </Text>
            {event.startDate ? (
              <Text className="text-muted-foreground text-sm mt-0.5">
                {formatDateBR(event.startDate)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {!isReachable ? (
          <Surface variant="tertiary" className="mx-4 mt-3 p-3 rounded-2xl">
            <Text className="text-foreground text-sm mb-3">
              Desktop desconectado. Conecte-se para sincronizar dados.
            </Text>
            <View className="flex-row gap-2">
              <Button
                size="sm"
                className="px-3 py-2"
                onPress={() => checkReachability()}
              >
                Tentar novamente
              </Button>
              <Button
                size="sm"
                variant="bordered"
                className="px-3 py-2"
                onPress={() => router.push("/pair")}
              >
                Reconectar
              </Button>
            </View>
          </Surface>
        ) : null}

        <View className="px-4 py-2 border-b border-border">
          <Input
            placeholder="Buscar por nome, CPF, data ou código do ticket"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            className="mb-2"
          />
          <View className="flex-row gap-2 flex-wrap">
            <Button
              size="sm"
              variant="bordered"
              className="px-3 py-2"
              onPress={() => setShowQrScanner(true)}
            >
              Escanear ingresso
            </Button>
            <Button
              size="sm"
              variant="bordered"
              className="px-3 py-2"
              onPress={handleResetCheckins}
              isLoading={resetLoading}
              isDisabled={resetLoading}
            >
              Desfazer check-ins
            </Button>
          </View>
        </View>

        {offlineNoticeVisible ? (
          <Surface
            variant="tertiary"
            className="mx-4 mt-2 px-3 py-2 rounded-2xl"
          >
            <Text className="text-muted-foreground text-xs">
              Sem conexão. Check-in será sincronizado quando houver rede.
            </Text>
          </Surface>
        ) : null}

        <View className="px-4 py-3 flex-row gap-4 border-b border-border">
          <View>
            <Text className="text-2xl font-bold text-foreground">{total}</Text>
            <Text className="text-muted-foreground text-xs">Total</Text>
          </View>
          <View>
            <Text className="text-2xl font-bold text-success">{confirmed}</Text>
            <Text className="text-muted-foreground text-xs">Confirmados</Text>
          </View>
          <View>
            <Text className="text-2xl font-bold text-warning">{pending}</Text>
            <Text className="text-muted-foreground text-xs">Aguardando</Text>
          </View>
        </View>

        {participantsQuery.isLoading ? (
          <View className="flex-1 justify-center items-center">
            <Spinner size="lg" />
          </View>
        ) : (
          <FlatList
            data={filteredParticipants}
            keyExtractor={(participant) => participant.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: scale(8) }}
            ListEmptyComponent={EmptyList}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
          />
        )}
      </Container>

      <ConfirmTakeoutModal
        visible={!!selectedParticipant}
        participant={selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        onConfirmed={handleConfirmed}
        onQueuedOffline={handleQueuedOffline}
        onConflict={handleConflict}
      />
    </>
  );
}
