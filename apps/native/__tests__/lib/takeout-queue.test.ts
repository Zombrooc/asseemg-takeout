import {
  addToQueue,
  getPendingQueue,
  removeFromQueue,
} from "@/lib/takeout-queue";

jest.mock("@/lib/storage/takeout-outbox", () => ({
  getReadyOperations: jest.fn(),
  enqueueCheckin: jest.fn(),
  acknowledgeOperation: jest.fn(),
  pendingOperationCount: jest.fn(),
  rejectOperation: jest.fn(),
  retryOperation: jest.fn(),
}));
const outbox = jest.requireMock("@/lib/storage/takeout-outbox") as {
  getReadyOperations: jest.Mock; enqueueCheckin: jest.Mock; acknowledgeOperation: jest.Mock;
};

describe("takeout-queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    outbox.getReadyOperations.mockResolvedValue([]);
  });

  describe("getPendingQueue", () => {
    it("returns empty array when durable outbox is empty", async () => {
      const list = await getPendingQueue();
      expect(list).toEqual([]);
    });

    it("projects durable operations without using AsyncStorage", async () => {
      outbox.getReadyOperations.mockResolvedValue([{ operationId: "r1", eventId: "e1", entityId: "p1", action: "confirm_checkin", payload: { ticket_id: "T1", device_id: "d1" }, sourceType: "json_sync", status: "pending", attempts: 0, createdAt: 0, nextRetryAt: 0 }]);
      const list = await getPendingQueue();
      expect(list[0]).toMatchObject({ request_id: "r1", ticket_id: "T1", device_id: "d1" });
    });
  });

  describe("addToQueue", () => {
    it("atomically enqueues an operation and its provisional projection", async () => {
      await addToQueue({
        request_id: "req-1",
        ticket_id: "T1",
        device_id: "d1",
      });
      expect(outbox.enqueueCheckin).toHaveBeenCalledWith(expect.objectContaining({ operationId: "req-1", entityId: "T1" }));
    });
  });

  describe("removeFromQueue", () => {
    it("acknowledges the durable operation instead of deleting intent", async () => {
      const operation = { operationId: "r1" };
      outbox.getReadyOperations.mockResolvedValue([operation]);
      await removeFromQueue("r1");
      expect(outbox.acknowledgeOperation).toHaveBeenCalledWith(operation);
    });
  });
});
