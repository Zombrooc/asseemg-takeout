# Local-first synchronization

The Electron SQLite database is authoritative. A mobile confirmation first writes a SQLite transaction containing the immutable operation and a `pending` local projection. Only after that transaction commits does the UI close; the eventual server acknowledgement changes the projection to `authoritative`.

## Transport

Mobile operations have stable UUID operation IDs and use at-least-once delivery. The WebSocket protocol begins with `connection.hello` (access token and device ID), followed by explicit `sync.subscribe` messages and optional `command.execute` messages. The server binds identity to the authenticated token, limits messages to 64 KiB, rejects unauthenticated clients after ten seconds, and sends heartbeats.

HTTP confirmation remains a fallback and uses the same idempotency key. The server stores the definitive result in `takeout_events`; replays return the original outcome. A competing check-in returns a conflict and the mobile operation remains recorded as `conflict`, never silently discarded.

## Ordering and recovery

The outbox serializes pending operations per entity. Failures return an operation to `pending` with exponential backoff and bounded jitter. Cursor persistence is stored in `sync_cursors`; each sequenced event is applied to the participant projection in the same transaction that advances its cursor.

The event log is append-only. Command paths append an event within the authority transaction and broadcast it only after commit. A client reconnects with a cursor through `sync.subscribe`; events are replayed in global sequence order for that event, so clients must not assume sequence values are contiguous.

## Known platform limitation

Expo SQLite provides durable local storage but does not encrypt the database at rest by itself. Pairing credentials must remain in SecureStore and device data should be cleared only through an explicit unpair workflow after pending operations have been reconciled or exported.

## Mobile projection and identity

Participant state is normalized by `eventId + sourceType + entityId`. For `json_sync`, `entityId` is the ticket ID; for `legacy_csv`, it is the legacy participant ID. This distinction is mandatory because a JSON participant can own multiple tickets and each ticket has an independent check-in.

`participant-store.ts` keeps a stable list of entity keys and a snapshot per entity. Cards subscribe with `useSyncExternalStore` to one entity only. Check-in, sync status, conflicts and locks replace only that entity snapshot. Aggregate counters are adjusted on effective transitions and have a separate subscription. Lock renewals reschedule the entity expiration timer without notifying the card when the visible owner is unchanged.

Snapshots downloaded over HTTP are stored in `participant_entities`. When the event screen is opened without a reachable desktop, the last durable snapshot is loaded from SQLite. Search uses the store's normalized index and QR/ticket lookups no longer scan the rendered participant array.

Before an HTTP snapshot request, the mobile records its current durable cursor. Snapshot upserts and removals are then conditional: a row changed by a newer WebSocket event is not overwritten by the older request. Event source metadata is persisted separately so a cold offline start selects the correct `json_sync` or `legacy_csv` projection.

## Durable outbox state machine

The outbox states are `pending`, `sending`, `acknowledged`, `conflict` and `failed`. Enqueue writes the immutable operation and the provisional projection in one exclusive SQLite transaction. JSON operations are keyed by ticket; legacy operations are keyed by participant.

All mobile SQLite writes (snapshot import, replay/cursor application and outbox transitions) pass through one process-wide write coordinator. Expo's exclusive transactions use a separate connection and reject overlapping async writes with `SQLITE_BUSY`; serializing writers, while keeping WAL reads concurrent, prevents snapshot/replay traffic from racing a local check-in. A bounded `busy_timeout` covers short native lock hand-offs, and the coordinator always releases its queue after a failed task.

A worker claims `pending` work with a 30-second lease. An expired or missing `sending` lease is returned to `pending` on startup/resume. Retry timestamps use bounded exponential backoff with jitter and the worker installs a timer for the earliest durable wake time, so a retry does not depend on a new UI or network event. The worker is mounted at the app root and also resumes on `AppState=active`.

Timeout means unknown outcome. It does not create a new operation: the same `operationId` is retried or sent through HTTP fallback, allowing the desktop authority to return its stored result.

## Central WebSocket manager

`TakeoutSyncManager` owns one authenticated WebSocket per paired device. Event-specific and `_events` subscriptions share it. The manager correlates `command.ack` and `command.rejected` by operation ID, tracks connection health, reconnects with backoff, and resubscribes from durable cursors.

The desktop sends a durable `serverInstanceId`. Normal process restarts retain it in `authority_metadata`; replacing the authority database produces another ID and causes clients to replay from zero without deleting their outbox. Replayed events are sent in batches of 250 with a basic buffered-amount backpressure guard. A client must not infer a gap from non-consecutive global sequence numbers.

On mobile, an event with a sequence is applied to `participant_entities` and advances `sync_cursors` in the same SQLite transaction before notifying the in-memory store. Duplicate or older sequences for the same server instance are ignored. The authoritative Electron command service is shared by HTTP and WebSocket for both `json_sync` and `legacy_csv`; broadcast occurs only after the transaction commits.

## Deployment notes

- The participant screen uses FlashList v2 and passes stable entity-key arrays; v2 size-estimation props are intentionally absent.
- SQLite schema upgrades preserve existing operations and migrate the former entity-only provisional projection to the scoped `(event_id, source_type, entity_id)` key.
- Mobile SQLite is not encrypted at rest. Do not log access tokens, CPF values, or full participant payloads in diagnostics.
- FPS, memory and device-to-device propagation latency still require release-build measurements on representative physical Android/iOS devices; unit tests only verify notification isolation and state transitions.
