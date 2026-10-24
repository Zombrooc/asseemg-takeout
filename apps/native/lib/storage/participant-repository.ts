import type { WsTakeoutMessage } from "@pickup/api/takeout-contracts";
import {
	getTakeoutDatabase,
	withTakeoutWriteTransaction,
} from "@/lib/storage/takeout-database";
import type {
	EventParticipant,
	LegacyEventParticipant,
} from "@/lib/takeout-api-types";
import {
	getTakeoutEntityId,
	type TakeoutParticipant,
	type TakeoutSourceType,
} from "@/lib/takeout-identity";

type ParticipantRow = {
	payload_json: string;
	authoritative_checkin: number;
};

function participantPatch(
	message: Extract<WsTakeoutMessage, { type: "participant_updated" }>,
): Partial<TakeoutParticipant> {
	return {
		...(message.name !== undefined ? { name: message.name } : {}),
		...(message.cpf !== undefined ? { cpf: message.cpf } : {}),
		...(message.birthDate !== undefined
			? { birthDate: message.birthDate }
			: {}),
		...(message.ticketName !== undefined
			? { ticketName: message.ticketName }
			: {}),
		...(message.modality !== undefined ? { modality: message.modality } : {}),
		...(message.shirtSize !== undefined
			? { shirtSize: message.shirtSize }
			: {}),
		...(message.team !== undefined ? { team: message.team } : {}),
	} as Partial<TakeoutParticipant>;
}

/** Replaces one event snapshot atomically without touching outbox or cursor data. */
export async function persistParticipantSnapshot(
	eventId: string,
	sourceType: TakeoutSourceType,
	participants: readonly TakeoutParticipant[],
	preserveAfterSeq = Number.MAX_SAFE_INTEGER,
): Promise<void> {
	const now = Date.now();
	await withTakeoutWriteTransaction(async (tx) => {
		const incoming = new Set<string>();
		await tx.runAsync(
			`INSERT INTO participant_event_metadata(event_id,source_type,updated_at) VALUES(?,?,?)
       ON CONFLICT(event_id) DO UPDATE SET source_type=excluded.source_type,updated_at=excluded.updated_at`,
			eventId,
			sourceType,
			now,
		);
		for (const participant of participants) {
			const entityId = getTakeoutEntityId(participant, sourceType);
			incoming.add(entityId);
			await tx.runAsync(
				`INSERT INTO participant_entities(event_id,source_type,entity_id,participant_id,payload_json,authoritative_checkin,last_seq,updated_at)
         VALUES(?,?,?,?,?,?,0,?)
         ON CONFLICT(event_id,source_type,entity_id) DO UPDATE SET
           participant_id=excluded.participant_id,payload_json=excluded.payload_json,
           authoritative_checkin=excluded.authoritative_checkin,updated_at=excluded.updated_at
           WHERE participant_entities.last_seq<=?`,
				eventId,
				sourceType,
				entityId,
				participant.id,
				JSON.stringify(participant),
				participant.checkinDone ? 1 : 0,
				now,
				preserveAfterSeq,
			);
		}
		const existing = await tx.getAllAsync<{ entity_id: string }>(
			"SELECT entity_id FROM participant_entities WHERE event_id=? AND source_type=?",
			eventId,
			sourceType,
		);
		for (const row of existing) {
			if (!incoming.has(row.entity_id)) {
				await tx.runAsync(
					"DELETE FROM participant_entities WHERE event_id=? AND source_type=? AND entity_id=? AND last_seq<=?",
					eventId,
					sourceType,
					row.entity_id,
					preserveAfterSeq,
				);
			}
		}
	});
}

export async function loadParticipantSourceType(
	eventId: string,
): Promise<TakeoutSourceType | null> {
	const row = await (await getTakeoutDatabase()).getFirstAsync<{
		source_type: string;
	}>(
		"SELECT source_type FROM participant_event_metadata WHERE event_id=?",
		eventId,
	);
	return row?.source_type === "legacy_csv"
		? "legacy_csv"
		: row?.source_type === "json_sync"
			? "json_sync"
			: null;
}

/** Commits the replay boundary, including an empty replay from a replaced authority. */
export async function completeRealtimeSync(
	eventId: string,
	serverInstanceId: string,
	latestSeq: number,
): Promise<void> {
	await withTakeoutWriteTransaction(async (tx) => {
		const cursor = await tx.getFirstAsync<{ server_instance_id: string }>(
			"SELECT server_instance_id FROM sync_cursors WHERE event_id=?",
			eventId,
		);
		if (cursor && cursor.server_instance_id !== serverInstanceId) {
			await tx.runAsync(
				"UPDATE participant_entities SET last_seq=0 WHERE event_id=?",
				eventId,
			);
		}
		await tx.runAsync(
			`INSERT INTO sync_cursors(event_id,server_instance_id,last_seq,updated_at) VALUES(?,?,?,?)
       ON CONFLICT(event_id) DO UPDATE SET server_instance_id=excluded.server_instance_id,
         last_seq=CASE WHEN sync_cursors.server_instance_id=excluded.server_instance_id THEN MAX(sync_cursors.last_seq,excluded.last_seq) ELSE excluded.last_seq END,
         updated_at=excluded.updated_at`,
			eventId,
			serverInstanceId,
			latestSeq,
			Date.now(),
		);
	});
}

export async function loadParticipantSnapshot(
	eventId: string,
	sourceType: "json_sync",
): Promise<EventParticipant[]>;
export async function loadParticipantSnapshot(
	eventId: string,
	sourceType: "legacy_csv",
): Promise<LegacyEventParticipant[]>;
export async function loadParticipantSnapshot(
	eventId: string,
	sourceType: TakeoutSourceType,
): Promise<TakeoutParticipant[]> {
	const rows = await (await getTakeoutDatabase()).getAllAsync<ParticipantRow>(
		"SELECT payload_json,authoritative_checkin FROM participant_entities WHERE event_id=? AND source_type=? ORDER BY rowid",
		eventId,
		sourceType,
	);
	return rows.map((row) => ({
		...(JSON.parse(row.payload_json) as TakeoutParticipant),
		checkinDone: row.authoritative_checkin === 1,
	}));
}

/** Applies a replay/live event and advances its durable cursor in one transaction. */
export async function persistRealtimeEvent(
	message: WsTakeoutMessage,
	serverInstanceId: string,
): Promise<boolean> {
	if (!("seq" in message) || typeof message.seq !== "number") return true;
	const seq = message.seq;
	const eventId =
		"event_id" in message && typeof message.event_id === "string"
			? message.event_id
			: null;
	if (!eventId) return false;
	let applied = false;
	await withTakeoutWriteTransaction(async (tx) => {
		const cursor = await tx.getFirstAsync<{
			server_instance_id: string;
			last_seq: number;
		}>(
			"SELECT server_instance_id,last_seq FROM sync_cursors WHERE event_id=?",
			eventId,
		);
		if (
			cursor?.server_instance_id === serverInstanceId &&
			seq <= cursor.last_seq
		)
			return;
		if (cursor && cursor.server_instance_id !== serverInstanceId) {
			// Sequences are scoped to one authoritative database instance. A restored
			// database may legitimately restart below the per-row sequence we knew.
			await tx.runAsync(
				"UPDATE participant_entities SET last_seq=0 WHERE event_id=?",
				eventId,
			);
		}

		if (
			message.type === "participant_checked_in" ||
			message.type === "participant_checkin_reverted"
		) {
			const sourceType =
				message.source_type === "legacy_csv" ? "legacy_csv" : "json_sync";
			const entityId =
				sourceType === "legacy_csv"
					? message.participant_id
					: message.ticket_id;
			if (entityId) {
				const done = message.type === "participant_checked_in" ? 1 : 0;
				await tx.runAsync(
					`UPDATE participant_entities SET authoritative_checkin=?,
             payload_json=json_set(payload_json,'$.checkinDone',?),last_seq=?,updated_at=?
           WHERE event_id=? AND source_type=? AND entity_id=? AND last_seq<?`,
					done,
					done,
					seq,
					Date.now(),
					eventId,
					sourceType,
					entityId,
					seq,
				);
			}
		} else if (message.type === "participant_updated") {
			const sourceType =
				message.source_type === "legacy_csv" ? "legacy_csv" : "json_sync";
			const entityId =
				sourceType === "legacy_csv"
					? message.participant_id
					: message.ticket_id;
			if (entityId) {
				const current = await tx.getFirstAsync<
					ParticipantRow & { participant_id: string; last_seq: number }
				>(
					`SELECT participant_id,payload_json,authoritative_checkin,last_seq
             FROM participant_entities WHERE event_id=? AND source_type=? AND entity_id=?`,
					eventId,
					sourceType,
					entityId,
				);
				const participant =
					message.participant ??
					(current
						? ({
								...(JSON.parse(current.payload_json) as TakeoutParticipant),
								...participantPatch(message),
							} as TakeoutParticipant)
						: null);
				if (participant && (!current || current.last_seq < seq)) {
					await tx.runAsync(
						`INSERT INTO participant_entities(event_id,source_type,entity_id,participant_id,payload_json,authoritative_checkin,last_seq,updated_at)
             VALUES(?,?,?,?,?,?,?,?)
             ON CONFLICT(event_id,source_type,entity_id) DO UPDATE SET
               participant_id=excluded.participant_id,payload_json=excluded.payload_json,
               authoritative_checkin=excluded.authoritative_checkin,last_seq=excluded.last_seq,
               updated_at=excluded.updated_at WHERE participant_entities.last_seq<excluded.last_seq`,
						eventId,
						sourceType,
						entityId,
						participant.id,
						JSON.stringify(participant),
						participant.checkinDone ? 1 : (current?.authoritative_checkin ?? 0),
						seq,
						Date.now(),
					);
				}
			}
		}

		await tx.runAsync(
			`INSERT INTO sync_cursors(event_id,server_instance_id,last_seq,updated_at) VALUES(?,?,?,?)
       ON CONFLICT(event_id) DO UPDATE SET server_instance_id=excluded.server_instance_id,
         last_seq=CASE WHEN sync_cursors.server_instance_id=excluded.server_instance_id THEN MAX(sync_cursors.last_seq,excluded.last_seq) ELSE excluded.last_seq END,
         updated_at=excluded.updated_at`,
			eventId,
			serverInstanceId,
			seq,
			Date.now(),
		);
		applied = true;
	});
	return applied;
}
