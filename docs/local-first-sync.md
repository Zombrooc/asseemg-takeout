# Local-first synchronization

The Electron SQLite database is authoritative. A mobile confirmation first writes a SQLite transaction containing the immutable operation and a `pending` local projection. Only after that transaction commits does the UI close; the eventual server acknowledgement changes the projection to `authoritative`.

## Transport

Mobile operations have stable UUID operation IDs and use at-least-once delivery. The WebSocket protocol begins with `connection.hello` (access token and device ID), followed by explicit `sync.subscribe` messages and optional `command.execute` messages. The server binds identity to the authenticated token, limits messages to 64 KiB, rejects unauthenticated clients after ten seconds, and sends heartbeats.

HTTP confirmation remains a fallback and uses the same idempotency key. The server stores the definitive result in `takeout_events`; replays return the original outcome. A competing check-in returns a conflict and the mobile operation remains recorded as `conflict`, never silently discarded.

## Ordering and recovery

The outbox serializes pending operations per entity. Failures return an operation to `pending` with exponential backoff and bounded jitter. Cursor persistence is stored in `sync_cursors`; an event must be applied in the same local transaction that advances its cursor (the event applier is the next projection consumer).

The event log is append-only. Command paths append an event within the authority transaction and broadcast it only after commit. A client reconnects with a cursor through `sync.subscribe`; events are replayed in global sequence order for that event, so clients must not assume sequence values are contiguous.

## Known platform limitation

Expo SQLite provides durable local storage but does not encrypt the database at rest by itself. Pairing credentials must remain in SecureStore and device data should be cleared only through an explicit unpair workflow after pending operations have been reconciled or exported.
