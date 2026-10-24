import { buildLegacyParticipantAlertMap } from "@pickup/api/legacy-participant-alerts";
import { getQrLookupValues } from "@pickup/api/wix-qr";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import type {
	CreateLegacyParticipantPayload,
	EventParticipant,
	LegacyEventParticipant,
	LegacyReservedNumber,
	ParticipantAlert,
	UpdateEventParticipantPayload,
} from "@/lib/takeout-api-types";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler } from "react-native";

import {
	EventHeader,
	OfflineQueueNotice,
	QrTicketScannerOverlay,
	QuickActionsRow,
	SearchBar,
	SummaryStats,
} from "@/components/mobile-tamagui/event";
import { EditParticipantModal } from "@/components/mobile-tamagui/event/edit-participant-modal";
import { LegacyCreateParticipantModal } from "@/components/mobile-tamagui/event/legacy-create-participant-modal";
import { ConfirmTakeoutModal } from "@/components/mobile/audit/confirm-takeout-modal";
import { ParticipantListItem } from "@/components/mobile-tamagui/participant-list-item";
import {
	Banner,
	Button,
	ScreenContainer,
	Spinner,
} from "@/components/ui-tamagui";
import { formatDateShort, normalizeDateOnly } from "@/lib/format-date";
import { useTakeoutRealtime } from "@/lib/takeout-realtime";
import { getPendingQueue } from "@/lib/takeout-queue";
import {
	participantStore,
	useParticipantCounts,
	useParticipantEntity,
	useParticipantIds,
} from "@/lib/participant-store";
import {
	isLegacyParticipant,
	type TakeoutParticipant,
	type TakeoutSourceType,
} from "@/lib/takeout-identity";
import {
	loadParticipantSnapshot,
	loadParticipantSourceType,
	persistParticipantSnapshot,
} from "@/lib/storage/participant-repository";
import { getSyncCursor } from "@/lib/storage/takeout-database";
import { CameraView, useCameraPermissions } from "expo-camera";
import { FlashList } from "@shopify/flash-list";
import { Text, View } from "react-native";
import { recordTakeoutMetric } from "@/lib/takeout-metrics";

const PARTICIPANTS_REFRESH_INTERVAL_MS = 120_000;
const EMPTY_PARTICIPANT_ALERTS: ParticipantAlert[] = [];
const EMPTY_PARTICIPANT_ALERT_MAP: Record<string, ParticipantAlert[]> = {};
const PARTICIPANT_LIST_CONTENT_STYLE = { paddingVertical: 8 };
const participantKeyExtractor = (entityKey: string) => entityKey;

type SourceType = TakeoutSourceType;
type DisplayParticipant = TakeoutParticipant;

function normalizeParticipantBirthDate(
	participant: DisplayParticipant,
): DisplayParticipant {
	const normalized = normalizeDateOnly(participant.birthDate);
	if (isLegacyParticipant(participant)) {
		return normalized === participant.birthDate
			? participant
			: { ...participant, birthDate: normalized ?? "" };
	}
	return normalized === participant.birthDate
		? participant
		: { ...participant, birthDate: normalized };
}

const PENDING_QUEUE_KEY = ["takeout-pending-queue"] as const;

type ParticipantRowProps = {
	entityKey: string;
	deviceId: string | null;
	onPrimaryAction: (entityKey: string) => void;
	onEdit: (entityKey: string) => void;
	onDismissConflict: (entityId: string) => void;
};

const ParticipantRow = memo(function ParticipantRow({
	entityKey,
	deviceId,
	onPrimaryAction,
	onEdit,
	onDismissConflict,
}: ParticipantRowProps) {
	recordTakeoutMetric("participant_render");
	const snapshot = useParticipantEntity(entityKey);
	if (!snapshot) return null;
	const item = snapshot.participant;
	const ticketLabel = snapshot.sourceType === "legacy_csv" && isLegacyParticipant(item)
		? `${item.modality ?? "Legado"} #${item.bibNumber}`
		: ((item as EventParticipant).sourceTicketId ?? (item as EventParticipant).ticketId);
	return (
		<ParticipantListItem
			entityKey={entityKey}
			id={item.id}
			ticketId={snapshot.entityId}
			name={item.name}
			ticketLabel={ticketLabel}
			isConfirmed={snapshot.authoritativeCheckin}
			isPendingSync={snapshot.syncStatus === "pending" || snapshot.syncStatus === "sending"}
			isConflict={snapshot.syncStatus === "conflict"}
			syncStatus={snapshot.syncStatus}
			lockedByOther={deviceId != null && snapshot.lockDeviceId != null && snapshot.lockDeviceId !== deviceId}
			alerts={[...snapshot.alerts]}
			onPrimaryAction={onPrimaryAction}
			onEdit={onEdit}
			onDismissConflict={onDismissConflict}
		/>
	);
});

const EmptyList = memo(function EmptyList() {
	return (
		<Text
			style={{ color: "#6b7280", textAlign: "center", paddingVertical: 32 }}
		>
			Nenhum participante.
		</Text>
	);
});

export default function EventScreen() {
	const { eventId } = useLocalSearchParams<{ eventId: string }>();
	const navigation = useNavigation();
	const router = useRouter();
	const queryClient = useQueryClient();
	const {
		api,
		isReachable,
		checkReachability,
		baseUrl,
		deviceId,
		accessToken,
	} = useTakeoutConnection();
	useTakeoutRealtime(
		eventId ?? undefined,
		baseUrl,
		deviceId,
		accessToken,
	);

	const [selectedEntityKey, setSelectedEntityKey] = useState<string | null>(null);
	const selectedSnapshot = useParticipantEntity(selectedEntityKey);
	const selectedParticipant = selectedSnapshot?.participant ?? null;
	const [editingParticipant, setEditingParticipant] =
		useState<DisplayParticipant | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [showQrScanner, setShowQrScanner] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [offlineNoticeVisible, setOfflineNoticeVisible] = useState(false);
	const [permission, requestPermission] = useCameraPermissions();
	const qrScanInFlightRef = useRef(false);

	const eventQuery = useQuery({
		queryKey: ["takeout-events"],
		queryFn: () =>
			api ? api.getEvents() : Promise.reject(new Error("No API")),
		enabled: !!api && isReachable,
	});

	const event = useMemo(
		() => eventQuery.data?.find((e) => e.eventId === eventId) ?? null,
		[eventQuery.data, eventId],
	);
	const [persistedSourceType, setPersistedSourceType] = useState<SourceType | null>(null);
	useEffect(() => {
		if (!eventId) return;
		let cancelled = false;
		void loadParticipantSourceType(eventId).then((value) => {
			if (!cancelled) setPersistedSourceType(value);
		});
		return () => { cancelled = true; };
	}, [eventId]);
	const sourceType: SourceType =
		event
			? event.sourceType === "legacy_csv" ? "legacy_csv" : "json_sync"
			: persistedSourceType ?? "json_sync";

	const participantsQuery = useQuery<DisplayParticipant[]>({
		queryKey: ["takeout-event-participants", eventId],
		queryFn: async () => {
			if (!eventId) throw new Error("No event");
			if (!api || !isReachable) {
				return sourceType === "legacy_csv"
					? loadParticipantSnapshot(eventId, "legacy_csv")
					: loadParticipantSnapshot(eventId, "json_sync");
			}
			const snapshotCursor = await getSyncCursor(eventId);
			const participants = sourceType === "legacy_csv"
				? await api.getLegacyEventParticipants(eventId)
				: await api.getEventParticipants(eventId);
			const normalized = participants.map(normalizeParticipantBirthDate);
			await persistParticipantSnapshot(eventId, sourceType, normalized, snapshotCursor?.lastSeq ?? 0);
			return sourceType === "legacy_csv"
				? loadParticipantSnapshot(eventId, "legacy_csv")
				: loadParticipantSnapshot(eventId, "json_sync");
		},
		enabled: !!eventId && (!!event || !!persistedSourceType || (isReachable && eventQuery.isSuccess)),
		refetchInterval: isReachable ? PARTICIPANTS_REFRESH_INTERVAL_MS : false,
		refetchIntervalInBackground: true,
	});

	const reservedNumbersQuery = useQuery<LegacyReservedNumber[]>({
		queryKey: ["takeout-legacy-reservations", eventId],
		queryFn: () =>
			api && eventId
				? api.getLegacyReservedNumbers(eventId)
				: Promise.reject(new Error("No API")),
		enabled: !!api && !!eventId && isReachable && sourceType === "legacy_csv",
	});
	const reservedNumbers = reservedNumbersQuery.data ?? [];

	const auditQuery = useQuery({
		queryKey: ["takeout-audit", eventId],
		queryFn: () =>
			api && eventId
				? api.getAudit({ eventId })
				: Promise.reject(new Error("No API")),
		enabled: !!api && !!eventId && isReachable,
	});

	const pendingQueueQuery = useQuery({
		queryKey: PENDING_QUEUE_KEY,
		queryFn: getPendingQueue,
		refetchInterval: isReachable ? 5000 : false,
	});

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

	const participants: DisplayParticipant[] = participantsQuery.data ?? [];
	const participantAlertMap = useMemo<Record<string, ParticipantAlert[]>>(
		() =>
			sourceType === "legacy_csv"
				? buildLegacyParticipantAlertMap(
						participants as LegacyEventParticipant[],
					)
				: EMPTY_PARTICIPANT_ALERT_MAP,
		[participants, sourceType],
	);

	useEffect(() => {
		if (!eventId) return;
		participantStore.hydrate(eventId, sourceType, participants, participantAlertMap);
	}, [eventId, sourceType, participants, participantAlertMap]);
	const participantIds = useParticipantIds(eventId ?? "", sourceType);
	const participantCounts = useParticipantCounts(eventId ?? "", sourceType);
	const filteredParticipantIds = useMemo(
		() => participantIds.length === 0
			? participantIds
			: participantStore.searchIds(eventId ?? "", sourceType, searchQuery),
		[eventId, sourceType, searchQuery, participantIds],
	);

	const auditStatusByTicket = useMemo(() => {
		const map = new Map<string, string>();
		(auditQuery.data ?? []).forEach((a) => {
			if (!map.has(a.ticket_id)) map.set(a.ticket_id, a.status);
		});
		return map;
	}, [auditQuery.data]);

	useEffect(() => {
		if (!eventId) return;
		for (const item of pendingQueueQuery.data ?? []) {
			if (item.event_id !== eventId) continue;
			const itemSource = item.source_type ?? "json_sync";
			const entityId = itemSource === "legacy_csv" ? (item.participant_id ?? item.ticket_id) : item.ticket_id;
			participantStore.setSyncStatus(eventId, itemSource, entityId, item.status ?? "pending", item.request_id);
		}
	}, [eventId, pendingQueueQuery.data]);

	useEffect(() => {
		if (!auditQuery.data?.length) return;
		if (sourceType === "legacy_csv") return;
		auditStatusByTicket.forEach((status, ticketId) => {
			if (status === "CONFIRMED" || status === "DUPLICATE") {
				participantStore.setAuthoritativeCheckin(eventId ?? "", sourceType, ticketId, true);
			}
		});
	}, [auditQuery.data, auditStatusByTicket, sourceType, eventId]);

	const total = participantCounts.total;
	const confirmed = participantCounts.confirmed;
	const pending = total - confirmed;

	const onQrScanned = useCallback(
		({ data }: { data: string }) => {
			if (qrScanInFlightRef.current) return;
			qrScanInFlightRef.current = true;
			const code = data.trim();
			const key = getQrLookupValues(code)
				.map((value) => participantStore.searchIds(eventId ?? "", sourceType, value)[0])
				.find((value): value is string => value != null);
			const snapshot = key ? participantStore.get(key) : null;
			const participant = snapshot?.participant;
			setShowQrScanner(false);
			if (!participant) {
				Alert.alert(
					"Ingresso não encontrado",
					"Ingresso não encontrado neste evento.",
				);
				return;
			}
			const isConfirmed = snapshot.authoritativeCheckin;
			if (isConfirmed) {
				setSelectedEntityKey(key ?? null);
				return;
			}
			if (
				deviceId != null &&
				snapshot.lockDeviceId != null &&
				snapshot.lockDeviceId !== deviceId
			) {
				Alert.alert(
					"Em atendimento",
					"Este participante está sendo atendido por outro dispositivo. Aguarde para fazer o check-in.",
				);
				return;
			}
			setSelectedEntityKey(key ?? null);
		},
		[eventId, deviceId, sourceType],
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

	const handleCreateReservation = useCallback(() => {
		if (!isReachable) {
			Alert.alert(
				"Offline",
				"Conecte-se ao desktop para cadastrar participante.",
			);
			return;
		}
		if (reservedNumbers.length === 0) {
			Alert.alert("Sem reservas", "Não há números reservados disponíveis.");
			return;
		}
		setShowCreateModal(true);
	}, [isReachable, reservedNumbers.length]);

	const handleOpenQrScanner = useCallback(() => {
		qrScanInFlightRef.current = false;
		setShowQrScanner(true);
	}, []);

	const createParticipantMutation = useMutation({
		mutationFn: async (payload: CreateLegacyParticipantPayload) => {
			if (!api || !eventId) throw new Error("Sem conexão com a API.");
			return api.postLegacyCreateParticipant(eventId, payload);
		},
		onSuccess: () => {
			setShowCreateModal(false);
			participantsQuery.refetch();
			reservedNumbersQuery.refetch();
		},
		onError: (err) => {
			const message =
				err instanceof Error ? err.message : "Falha ao cadastrar participante.";
			Alert.alert("Erro", message);
		},
	});

	const editParticipantMutation = useMutation({
		mutationFn: async (payload: UpdateEventParticipantPayload) => {
			if (!api || !eventId || !editingParticipant) {
				throw new Error("Sem conexão com a API.");
			}
			return sourceType === "legacy_csv"
				? api.putLegacyEventParticipant(eventId, editingParticipant.id, payload)
				: api.putEventParticipant(eventId, editingParticipant.id, payload);
		},
		onSuccess: (updated) => {
			const normalizedUpdated = normalizeParticipantBirthDate(updated);
			queryClient.setQueryData<DisplayParticipant[]>(
				["takeout-event-participants", eventId],
				(current) =>
					current?.map((item) =>
						item.id === normalizedUpdated.id ? normalizedUpdated : item,
					),
			);
			setEditingParticipant(null);
			Alert.alert("Participante atualizado", "As informações foram salvas.");
		},
		onError: (err) => {
			const message =
				err instanceof Error ? err.message : "Falha ao atualizar participante.";
			Alert.alert(
				"Não foi possível atualizar",
				message.includes("409")
					? "Participante já confirmado não pode ser editado."
					: message,
			);
		},
	});

	const handlePrimaryAction = useCallback((entityKey: string) => {
		if (!participantStore.get(entityKey)) return;
		setSelectedEntityKey(entityKey);
	}, []);

	const handleEdit = useCallback((entityKey: string) => {
		const snapshot = participantStore.get(entityKey);
		if (!snapshot) return;
		if (snapshot.authoritativeCheckin || snapshot.syncStatus === "pending" || snapshot.syncStatus === "sending") {
			Alert.alert(
				"Edição indisponível",
				"Participante já confirmado não pode ser editado.",
			);
			return;
		}
		setEditingParticipant(snapshot.participant);
	}, []);

	const selectedParticipantIsConfirmed = selectedSnapshot?.authoritativeCheckin ?? false;

	const handleDismissConflict = useCallback((ticketId: string) => {
		participantStore.setSyncStatus(eventId ?? "", sourceType, ticketId, "idle", null);
	}, [eventId, sourceType]);

	const handleConfirmed = useCallback(() => {
		setSelectedEntityKey(null);
	}, []);

	const handleConflict = useCallback(
		(ticketId: string) => {
			participantStore.setSyncStatus(eventId ?? "", sourceType, ticketId, "conflict", null);
			auditQuery.refetch();
		},
		[auditQuery, eventId, sourceType],
	);

	const renderItem = useCallback(({ item }: { item: string }) => {
		return (
			<ParticipantRow
				entityKey={item}
				deviceId={deviceId}
				onPrimaryAction={handlePrimaryAction}
				onEdit={handleEdit}
				onDismissConflict={handleDismissConflict}
			/>
		);
	}, [deviceId, handlePrimaryAction, handleEdit, handleDismissConflict]);

	if (!eventId) {
		return (
			<ScreenContainer mode="static">
				<View style={{ padding: 16 }}>
					<Text style={{ color: "#6b7280" }}>Evento não encontrado.</Text>
				</View>
			</ScreenContainer>
		);
	}

	if (showQrScanner) {
		if (!permission) {
			return (
				<ScreenContainer mode="static">
					<View style={{ padding: 16, paddingTop: 24 }}>
						<Text style={{ color: "#6b7280" }}>
							Verificando permissão da câmera...
						</Text>
					</View>
				</ScreenContainer>
			);
		}

		if (!permission.granted) {
			return (
				<ScreenContainer mode="static">
					<View style={{ padding: 16, paddingTop: 24 }}>
						<Text
							style={{ color: "#111827", fontWeight: "500", marginBottom: 8 }}
						>
							Acesso à câmera
						</Text>
						<Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
							Necessário para escanear o QR do ingresso.
						</Text>
						<Button onPress={requestPermission}>Permitir câmera</Button>
						<View style={{ marginTop: 12 }}>
							<Button
								variant="bordered"
								onPress={() => setShowQrScanner(false)}
							>
								Voltar
							</Button>
						</View>
					</View>
				</ScreenContainer>
			);
		}

		return (
			<View style={{ flex: 1, backgroundColor: "black" }}>
				<CameraView
					style={{ flex: 1 }}
					facing="back"
					barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
					onBarcodeScanned={onQrScanned}
				/>
				<QrTicketScannerOverlay onBack={() => setShowQrScanner(false)} />
				<View
					style={{
						position: "absolute",
						bottom: 0,
						left: 0,
						right: 0,
						padding: 16,
						paddingBottom: 32,
					}}
				>
					<Button variant="bordered" onPress={() => setShowQrScanner(false)}>
						Cancelar
					</Button>
				</View>
			</View>
		);
	}

	return (
		<>
			<ScreenContainer mode="static">
				{event ? (
					<EventHeader
						title={event.name ?? eventId}
						subtitle={
							event.startDate ? formatDateShort(event.startDate) : undefined
						}
						isLive={isReachable}
					/>
				) : null}

				{!isReachable ? (
					<Banner
						variant="warn"
						style={{ marginHorizontal: 16, marginTop: 12 }}
					>
						<Text style={{ color: "#111827", fontSize: 14, marginBottom: 12 }}>
							Desktop desconectado. Conecte-se para sincronizar dados.
						</Text>
						<View style={{ flexDirection: "row", gap: 8 }}>
							<Button onPress={() => checkReachability()}>
								Tentar novamente
							</Button>
							<Button variant="bordered" onPress={() => router.push("/pair")}>
								Reconectar
							</Button>
						</View>
					</Banner>
				) : null}

				<View
					style={{
						paddingHorizontal: 16,
						paddingVertical: 8,
						borderBottomWidth: 1,
						borderColor: "#e5e7eb",
						backgroundColor: "#ffffff",
					}}
				>
					<SearchBar value={searchQuery} onChange={setSearchQuery} />
					<QuickActionsRow
						onScan={handleOpenQrScanner}
						onCreateReservation={
							sourceType === "legacy_csv" ? handleCreateReservation : undefined
						}
						createDisabled={!isReachable || reservedNumbers.length === 0}
					/>
				</View>

				<OfflineQueueNotice visible={offlineNoticeVisible} />

				<SummaryStats
					total={total}
					confirmed={confirmed}
					pending={pending}
					pendingSync={participantCounts.pendingSync}
					conflicts={participantCounts.conflicts}
				/>

				{participantsQuery.isLoading ? (
					<View
						style={{
							flex: 1,
							justifyContent: "center",
							alignItems: "center",
							minHeight: 200,
							backgroundColor: "#ffffff",
						}}
					>
						<Spinner size="large" />
					</View>
				) : (
					<FlashList
						data={filteredParticipantIds}
						keyExtractor={participantKeyExtractor}
						renderItem={renderItem}
						contentContainerStyle={PARTICIPANT_LIST_CONTENT_STYLE}
						ListEmptyComponent={EmptyList}
						keyboardShouldPersistTaps="handled"
					/>
				)}
			</ScreenContainer>

			<ConfirmTakeoutModal
				visible={selectedEntityKey != null}
				participant={selectedParticipant}
				readOnly={selectedParticipantIsConfirmed}
				alerts={selectedSnapshot?.alerts ? [...selectedSnapshot.alerts] : EMPTY_PARTICIPANT_ALERTS}
				sourceType={sourceType}
				eventId={eventId}
				onClose={() => setSelectedEntityKey(null)}
				onConfirmed={handleConfirmed}
				onQueuedOffline={handleQueuedOffline}
				onConflict={handleConflict}
			/>

			<LegacyCreateParticipantModal
				visible={showCreateModal}
				reservations={reservedNumbers}
				submitting={createParticipantMutation.isPending}
				onClose={() => setShowCreateModal(false)}
				onSubmit={(payload) => createParticipantMutation.mutate(payload)}
			/>

			<EditParticipantModal
				visible={!!editingParticipant}
				participant={editingParticipant}
				sourceType={sourceType}
				submitting={editParticipantMutation.isPending}
				onClose={() => setEditingParticipant(null)}
				onSubmit={(payload) => editParticipantMutation.mutate(payload)}
			/>
		</>
	);
}
