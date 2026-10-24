const persistRealtimeEvent = jest.fn();
const completeRealtimeSync = jest.fn();
const getSyncCursor = jest.fn(async () => null);

jest.mock("@/lib/storage/participant-repository", () => ({ persistRealtimeEvent, completeRealtimeSync }));
jest.mock("@/lib/storage/takeout-database", () => ({ getSyncCursor }));

import { TakeoutSyncManager } from "@/lib/takeout-sync-manager";

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.OPEN;
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  constructor(_url: string) { FakeWebSocket.instances.push(this); }
  send(value: string): void { this.sent.push(value); }
  close(): void { this.readyState = 3; this.onclose?.(); }
  emit(message: object): void { this.onmessage?.({ data: JSON.stringify(message) }); }
}

describe("TakeoutSyncManager ordered event application", () => {
  const originalWebSocket = global.WebSocket;

  beforeAll(() => { global.WebSocket = FakeWebSocket as unknown as typeof WebSocket; });
  afterAll(() => { global.WebSocket = originalWebSocket; });
  beforeEach(() => {
    FakeWebSocket.instances = [];
    persistRealtimeEvent.mockReset();
    completeRealtimeSync.mockReset();
    getSyncCursor.mockClear();
  });

  it("serializes global event sequences and still applies lock snapshots", async () => {
    let releaseFirst!: () => void;
    const firstBlocked = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const persisted: number[] = [];
    persistRealtimeEvent.mockImplementation(async (message: { seq: number }) => {
      persisted.push(message.seq);
      if (message.seq === 10) await firstBlocked;
      return true;
    });
    const delivered: string[] = [];
    const manager = new TakeoutSyncManager();
    manager.subscribe("event-1", (message) => { delivered.push(message.type); });
    manager.configure({ baseUrl: "http://desktop", accessToken: "token", deviceId: "device" });
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    socket.emit({ type: "connection.ready", protocolVersion: 1, deviceId: "device", serverInstanceId: "server" });
    socket.emit({ type: "participant_checked_in", event_id: "event-1", ticket_id: "ticket-1", seq: 10 });
    socket.emit({ type: "participant_checked_in", event_id: "event-1", ticket_id: "ticket-2", seq: 13 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(persisted).toEqual([10]);

    releaseFirst();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(persisted).toEqual([10, 13]);

    socket.emit({ type: "lock_snapshot", event_id: "event-1", participant_id: "participant-1", device_id: "other", expires_at: 9999999999, seq: 13 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(persistRealtimeEvent).toHaveBeenCalledTimes(2);
    expect(delivered).toContain("lock_snapshot");
    socket.emit({ type: "sync.completed", eventId: "event-1", latestSeq: 13 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(completeRealtimeSync).toHaveBeenCalledWith("event-1", "server", 13);
    manager.stop();
  });
});
