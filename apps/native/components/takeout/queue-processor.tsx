import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { participantStore } from "@/lib/participant-store";
import {
	markSending,
	nextOperationWakeAt,
	onOutboxChanged,
	recoverExpiredSending,
} from "@/lib/storage/takeout-outbox";
import { TakeoutApiError } from "@/lib/takeout-api";
import { metricNow, recordTakeoutMetric } from "@/lib/takeout-metrics";
import {
	acknowledgeOperation,
	failOperation,
	getReadyOperations,
	rejectOperation,
	retryOperation,
} from "@/lib/takeout-queue";

export function TakeoutQueueProcessor() {
	const queryClient = useQueryClient();
	const { api, deviceId, isReachable, syncManager } = useTakeoutConnection();
	const processing = useRef(false);
	const wakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [wsOperational, setWsOperational] = useState(
		syncManager.isOperational(),
	);

	useEffect(() => {
		setWsOperational(syncManager.isOperational());
		return syncManager.onStateChange(setWsOperational);
	}, [syncManager]);

	const clearWakeTimer = useCallback(() => {
		if (wakeTimer.current) clearTimeout(wakeTimer.current);
		wakeTimer.current = null;
	}, []);

	useEffect(() => {
		if (!api || !deviceId || (!isReachable && !wsOperational)) return;
		let cancelled = false;
		const reportWorkerError = (error: unknown) => {
			if (typeof __DEV__ !== "undefined" && __DEV__) {
				console.error(
					"[takeout.outbox] worker scheduling failed",
					error instanceof Error ? error.message : "unknown error",
				);
			}
		};
		const scheduleRecoveryWake = () => {
			if (cancelled) return;
			clearWakeTimer();
			wakeTimer.current = setTimeout(() => {
				void process();
			}, 1_000);
		};
		const scheduleNextWake = async () => {
			try {
				clearWakeTimer();
				const wakeAt = await nextOperationWakeAt();
				if (cancelled || wakeAt == null) return;
				wakeTimer.current = setTimeout(
					() => {
						void process();
					},
					Math.max(25, wakeAt - Date.now()),
				);
			} catch (error) {
				reportWorkerError(error);
				scheduleRecoveryWake();
			}
		};
		const process = async () => {
			if (cancelled || processing.current) return;
			processing.current = true;
			let item:
				| Awaited<ReturnType<typeof getReadyOperations>>[number]
				| undefined;
			try {
				await recoverExpiredSending();
				const list = await getReadyOperations();
				recordTakeoutMetric("outbox_size", list.length);
				item = list[0];
				if (!item) return;
				if (!(await markSending(item.operationId))) return;
				participantStore.setSyncStatus(
					item.eventId,
					item.sourceType,
					item.entityId,
					"sending",
					item.operationId,
				);
				const payload = item.payload;
				const sendStartedAt = metricNow();
				const wsResult = await syncManager.execute({
					operationId: item.operationId,
					eventId: item.eventId,
					action: "confirm_checkin",
					payload:
						item.sourceType === "legacy_csv"
							? {
									sourceType: "legacy_csv",
									participantId: item.entityId,
									payloadJson:
										typeof payload.payload_json === "string"
											? payload.payload_json
											: undefined,
								}
							: {
									sourceType: "json_sync",
									ticketId: item.entityId,
									payloadJson:
										typeof payload.payload_json === "string"
											? payload.payload_json
											: undefined,
								},
				});
				recordTakeoutMetric("operation_send_ms", metricNow() - sendStartedAt);
				if (wsResult.kind === "rejected") {
					if (wsResult.reason === "CHECKIN_ALREADY_CONFIRMED") {
						recordTakeoutMetric("operation_conflict");
						await rejectOperation(item, wsResult.reason);
					} else {
						await failOperation(item, wsResult.reason);
					}
					queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
					return;
				}
				const res =
					wsResult.kind === "ack"
						? { status: wsResult.status }
						: item.sourceType === "legacy_csv"
							? await api.postLegacyTakeoutConfirm({
									request_id: item.operationId,
									event_id: item.eventId,
									participant_id: item.entityId,
									device_id: String(payload.device_id),
									payload_json:
										typeof payload.payload_json === "string"
											? payload.payload_json
											: undefined,
								})
							: await api.postTakeoutConfirm({
									request_id: item.operationId,
									ticket_id: item.entityId,
									device_id: String(payload.device_id),
									payload_json:
										typeof payload.payload_json === "string"
											? payload.payload_json
											: undefined,
								});
				if (res.status === "CONFIRMED" || res.status === "DUPLICATE") {
					recordTakeoutMetric("operation_ack_ms", metricNow() - sendStartedAt);
					await acknowledgeOperation(item);
					queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
				} else {
					recordTakeoutMetric("operation_retry");
					await retryOperation(item, `Unexpected response: ${res.status}`);
				}
			} catch (e) {
				if (!item) return;
				try {
					if (e instanceof TakeoutApiError && e.status === 409) {
						recordTakeoutMetric("operation_conflict");
						await rejectOperation(item, e.body);
						queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
					} else if (
						e instanceof TakeoutApiError &&
						e.status >= 400 &&
						e.status < 500
					) {
						await failOperation(item, e.body);
					} else {
						recordTakeoutMetric("operation_retry");
						await retryOperation(
							item,
							e instanceof Error ? e.message : "Transport failure",
						);
					}
				} catch (recoveryError) {
					reportWorkerError(recoveryError);
				}
			} finally {
				processing.current = false;
				if (!cancelled) {
					try {
						const remaining = await getReadyOperations();
						if (remaining.length > 0) void process();
						else void scheduleNextWake();
					} catch (error) {
						reportWorkerError(error);
						scheduleRecoveryWake();
					}
				}
			}
		};
		void process();
		const unsubscribe = onOutboxChanged(() => {
			void process();
		});
		const appStateSubscription = AppState.addEventListener(
			"change",
			(state) => {
				if (state === "active") void process();
			},
		);
		return () => {
			cancelled = true;
			clearWakeTimer();
			unsubscribe();
			appStateSubscription.remove();
		};
	}, [
		api,
		deviceId,
		isReachable,
		wsOperational,
		queryClient,
		clearWakeTimer,
		syncManager,
	]);

	return null;
}
