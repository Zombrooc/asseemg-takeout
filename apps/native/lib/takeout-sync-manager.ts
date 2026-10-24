import type { SyncCommand, WsTakeoutMessage } from "@pickup/api/takeout-contracts";
import { metricNow, recordTakeoutMetric } from "@/lib/takeout-metrics";

const COMMAND_TIMEOUT_MS = 8_000;
const HEARTBEAT_TIMEOUT_MS = 90_000;
const INITIAL_RECONNECT_MS = 1_500;
const MAX_RECONNECT_MS = 15_000;

type Credentials = { baseUrl: string; accessToken: string; deviceId: string };
type EventListener = (message: WsTakeoutMessage) => void | Promise<void>;
type StateListener = (connected: boolean) => void;
export type CommandResult =
  | { kind: "ack"; status: string; duplicate: boolean }
  | { kind: "rejected"; reason: string; existingOperationId?: string }
  | { kind: "unknown" };

type PendingCommand = {
  resolve: (result: CommandResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

function websocketUrl(baseUrl: string): string {
  return `${baseUrl.replace(/^http/, "ws").replace(/\/$/, "")}/ws`;
}

export class TakeoutSyncManager {
  private credentials: Credentials | null = null;
  private socket: WebSocket | null = null;
  private subscriptions = new Map<string, Set<EventListener>>();
  private stateListeners = new Set<StateListener>();
  private pendingCommands = new Map<string, PendingCommand>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = INITIAL_RECONNECT_MS;
  private stopped = true;
  private serverInstanceId = "unknown";
  private ready = false;
  private messageChain: Promise<void> = Promise.resolve();

  configure(credentials: Credentials | null): void {
    const unchanged = credentials && this.credentials &&
      credentials.baseUrl === this.credentials.baseUrl &&
      credentials.accessToken === this.credentials.accessToken &&
      credentials.deviceId === this.credentials.deviceId;
    if (unchanged) return;
    this.stop();
    this.credentials = credentials;
    if (credentials) {
      this.stopped = false;
      this.connect();
    }
  }

  stop(): void {
    this.stopped = true;
    this.ready = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.socket?.close();
    this.socket = null;
    for (const pending of this.pendingCommands.values()) {
      clearTimeout(pending.timer);
      pending.resolve({ kind: "unknown" });
    }
    this.pendingCommands.clear();
    this.emitState(false);
  }

  isOperational(): boolean {
    return this.ready && this.socket?.readyState === WebSocket.OPEN;
  }

  subscribe(eventId: string, listener: EventListener): () => void {
    const listeners = this.subscriptions.get(eventId) ?? new Set();
    const wasEmpty = listeners.size === 0;
    listeners.add(listener);
    this.subscriptions.set(eventId, listeners);
    if (wasEmpty && this.ready) void this.sendSubscription(eventId);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.subscriptions.delete(eventId);
    };
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  async execute(command: Omit<SyncCommand, "type" | "protocolVersion">): Promise<CommandResult> {
    if (!this.isOperational() || !this.socket) return { kind: "unknown" };
    if (this.pendingCommands.has(command.operationId)) return { kind: "unknown" };
    return new Promise<CommandResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(command.operationId);
        resolve({ kind: "unknown" });
      }, COMMAND_TIMEOUT_MS);
      this.pendingCommands.set(command.operationId, { resolve, timer });
      this.socket?.send(JSON.stringify({
        ...command,
        type: "command.execute",
        protocolVersion: 1,
      } satisfies SyncCommand));
    });
  }

  private connect(): void {
    if (this.stopped || !this.credentials) return;
    const credentials = this.credentials;
    const socket = new WebSocket(websocketUrl(credentials.baseUrl));
    this.socket = socket;
    this.resetHeartbeat();
    socket.onopen = () => {
      this.reconnectDelay = INITIAL_RECONNECT_MS;
      socket.send(JSON.stringify({ type: "connection.hello", protocolVersion: 1, token: credentials.accessToken, deviceId: credentials.deviceId }));
      this.resetHeartbeat();
    };
    socket.onmessage = (event) => {
      this.messageChain = this.messageChain
        .then(() => this.handleMessage(event.data))
        .catch((error: unknown) => {
          if (typeof __DEV__ !== "undefined" && __DEV__) {
            console.error("[takeout.sync] event application failed", error instanceof Error ? error.message : "unknown error");
          }
          socket.close(1011, "event application failed");
        });
    };
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.ready = false;
      this.emitState(false);
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private async handleMessage(raw: unknown): Promise<void> {
    const startedAt = metricNow();
    this.resetHeartbeat();
    let message: WsTakeoutMessage;
    try {
      message = JSON.parse(String(raw)) as WsTakeoutMessage;
    } catch {
      return;
    }
    if (message.type === "connection.heartbeat" || message.type === "heartbeat") return;
    if (message.type === "connection.ready") {
      this.serverInstanceId = message.serverInstanceId ?? "legacy-server";
      this.ready = true;
      this.emitState(true);
      await Promise.all([...this.subscriptions.keys()].map((eventId) => this.sendSubscription(eventId)));
      return;
    }
    if (message.type === "command.ack" || message.type === "command.rejected") {
      const pending = this.pendingCommands.get(message.operationId);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pendingCommands.delete(message.operationId);
      pending.resolve(message.type === "command.ack"
        ? { kind: "ack", status: message.status, duplicate: message.duplicate ?? false }
        : { kind: "rejected", reason: message.reason, ...(message.existingOperationId ? { existingOperationId: message.existingOperationId } : {}) });
      return;
    }
    const eventId = "event_id" in message && typeof message.event_id === "string"
      ? message.event_id
      : message.type === "sync.completed" ? message.eventId : null;
    if (!eventId) return;
    if (message.type === "sync.completed") {
      const { completeRealtimeSync } = await import("@/lib/storage/participant-repository");
      await completeRealtimeSync(eventId, this.serverInstanceId, message.latestSeq);
    }
    if (message.type !== "lock_snapshot" && "seq" in message && typeof message.seq === "number") {
      const { persistRealtimeEvent } = await import("@/lib/storage/participant-repository");
      if (!(await persistRealtimeEvent(message, this.serverInstanceId))) return;
    }
    for (const listener of this.subscriptions.get(eventId) ?? []) await listener(message);
    recordTakeoutMetric("realtime_event_ms", metricNow() - startedAt);
  }

  private async sendSubscription(eventId: string): Promise<void> {
    if (!this.ready || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const { getSyncCursor } = await import("@/lib/storage/takeout-database");
    const cursor = await getSyncCursor(eventId);
    const lastSeq = cursor?.serverInstanceId === this.serverInstanceId ? cursor.lastSeq : 0;
    this.socket.send(JSON.stringify({ type: "sync.subscribe", eventId, lastSeq }));
  }

  private resetHeartbeat(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => this.socket?.close(), HEARTBEAT_TIMEOUT_MS);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.stopped) return;
    const delay = this.reconnectDelay;
    recordTakeoutMetric("ws_reconnect");
    this.reconnectDelay = Math.min(Math.round(delay * 1.7), MAX_RECONNECT_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private emitState(connected: boolean): void {
    for (const listener of this.stateListeners) listener(connected);
  }
}

export const syncManagerConfig = { COMMAND_TIMEOUT_MS, HEARTBEAT_TIMEOUT_MS } as const;
export const takeoutSyncManager = new TakeoutSyncManager();
