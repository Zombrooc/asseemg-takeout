import { createTakeoutClient, TakeoutApiError } from "@/lib/takeout-api";

describe("createTakeoutClient", () => {
  const baseUrl = "http://192.168.1.10:5555";

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("calls GET /health with skipAuth and no Bearer", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "token",
    });
    await client.getHealth();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/health",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
    const call = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(call.headers).not.toHaveProperty("Authorization");
  });

  it("calls GET /events with Authorization Bearer", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "my-token",
    });
    await client.getEvents();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/events",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("POST /takeout/confirm sends request_id, ticket_id, device_id", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "CONFIRMED" }),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "dev-1",
    });
    await client.postTakeoutConfirm({
      request_id: "req-uuid",
      ticket_id: "T1",
      device_id: "dev-1",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/takeout/confirm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          request_id: "req-uuid",
          ticket_id: "T1",
          device_id: "dev-1",
        }),
      })
    );
  });

  it("throws TakeoutApiError when response not ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "bad",
    });
    await expect(client.getEvents()).rejects.toThrow(TakeoutApiError);
    await expect(client.getEvents()).rejects.toMatchObject({ status: 401 });
  });
});
