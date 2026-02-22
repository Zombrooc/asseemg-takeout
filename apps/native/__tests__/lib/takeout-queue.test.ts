import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addToQueue,
  getPendingQueue,
  removeFromQueue,
  setQueue,
} from "@/lib/takeout-queue";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("takeout-queue", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe("getPendingQueue", () => {
    it("returns empty array when storage is empty", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const list = await getPendingQueue();
      expect(list).toEqual([]);
    });

    it("returns parsed array when storage has valid JSON", async () => {
      const stored = [
        { request_id: "r1", ticket_id: "T1", device_id: "d1", created_at: "2026-01-01T00:00:00Z" },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(stored));
      const list = await getPendingQueue();
      expect(list).toEqual(stored);
    });

    it("returns empty array when storage has invalid JSON", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("not json");
      const list = await getPendingQueue();
      expect(list).toEqual([]);
    });
  });

  describe("addToQueue", () => {
    it("appends item with created_at and persists", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await addToQueue({
        request_id: "req-1",
        ticket_id: "T1",
        device_id: "d1",
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "takeout_pending_confirm",
        expect.stringContaining("req-1")
      );
      const stored = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        request_id: "req-1",
        ticket_id: "T1",
        device_id: "d1",
      });
      expect(stored[0].created_at).toBeDefined();
    });
  });

  describe("removeFromQueue", () => {
    it("removes item by request_id and persists", async () => {
      const stored = [
        { request_id: "r1", ticket_id: "T1", device_id: "d1", created_at: "2026-01-01T00:00:00Z" },
        { request_id: "r2", ticket_id: "T2", device_id: "d1", created_at: "2026-01-01T00:00:00Z" },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(stored));
      await removeFromQueue("r1");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "takeout_pending_confirm",
        JSON.stringify([stored[1]])
      );
    });
  });

  describe("setQueue", () => {
    it("overwrites storage with given list", async () => {
      const list = [
        { request_id: "r1", ticket_id: "T1", device_id: "d1", created_at: "2026-01-01T00:00:00Z" },
      ];
      await setQueue(list);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "takeout_pending_confirm",
        JSON.stringify(list)
      );
    });
  });
});
