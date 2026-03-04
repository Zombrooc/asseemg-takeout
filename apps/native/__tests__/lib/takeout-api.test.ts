import { createTakeoutClient, TakeoutApiError } from "@/lib/takeout-api";

describe("createTakeoutClient", () => {
  const baseUrl = "http://192.168.1.10:5555";

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("calls GET /health with skipAuth and no Bearer", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: "ok" })),
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
      text: () => Promise.resolve("[]"),
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
      text: () => Promise.resolve(JSON.stringify({ status: "CONFIRMED" })),
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
    await expect(client.getEvents()).rejects.toMatchObject({
      name: TakeoutApiError.name,
      status: 401,
    });
  });

  it("POST /events/:eventId/checkins/reset sends request and returns deleted count", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ deleted: 3 })),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "token",
    });
    const result = await client.postResetEventCheckins("ev-123");
    expect(result).toEqual({ deleted: 3 });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/events/ev-123/checkins/reset",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("calls GET /network/addresses without auth when requested", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            baseUrl: "http://192.168.1.10:5555",
            port: 5555,
            addresses: [],
          })
        ),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "token",
    });
    await client.getNetworkAddresses();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/network/addresses",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
    const call = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(call.headers).not.toHaveProperty("Authorization");
  });

  it("GET /audit with status filter builds query string", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("[]"),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "token",
    });
    await client.getAudit({ status: "CONFIRMED" });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/audit?status=CONFIRMED",
      expect.any(Object)
    );
  });

  it("GET /audit without params calls /audit with no query", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("[]"),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "token",
    });
    await client.getAudit();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/audit",
      expect.any(Object)
    );
  });

  it("GET /events/:eventId/participants/search sends q and mode", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("[]"),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "my-token",
    });
    await client.searchEventParticipants("ev-123", "joao", "nome");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/events/ev-123/participants/search?q=joao&mode=nome",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("POST /takeout/confirm sends payload_json when provided", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: "CONFIRMED" })),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "dev-1",
    });
    await client.postTakeoutConfirm({
      request_id: "req-uuid",
      ticket_id: "T1",
      device_id: "dev-1",
      payload_json:
        '{"retirada_por_terceiro":true,"retirante_nome":"Joao","retirante_cpf":"123"}',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/takeout/confirm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          request_id: "req-uuid",
          ticket_id: "T1",
          device_id: "dev-1",
          payload_json:
            '{"retirada_por_terceiro":true,"retirante_nome":"Joao","retirante_cpf":"123"}',
        }),
      })
    );
  });

  it("GET /events/:eventId/legacy-participants uses auth and path", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("[]"),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "legacy-token",
    });
    await client.getLegacyEventParticipants("ev-legacy");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/events/ev-legacy/legacy-participants",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer legacy-token",
        }),
      })
    );
  });

  it("POST /takeout/confirm/legacy sends participant and event ids", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: "CONFIRMED" })),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "legacy-token",
    });
    await client.postLegacyTakeoutConfirm({
      request_id: "req-legacy-1",
      event_id: "ev-legacy",
      participant_id: "lp-1",
      device_id: "dev-1",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/takeout/confirm/legacy",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          request_id: "req-legacy-1",
          event_id: "ev-legacy",
          participant_id: "lp-1",
          device_id: "dev-1",
        }),
      })
    );
  });

  it("POST /takeout/confirm/legacy sends payload_json when provided", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ status: "CONFIRMED" })),
    });
    const client = createTakeoutClient({
      baseUrl,
      getAccessToken: async () => "legacy-token",
    });
    await client.postLegacyTakeoutConfirm({
      request_id: "req-legacy-2",
      event_id: "ev-legacy",
      participant_id: "lp-1",
      device_id: "dev-1",
      payload_json: '{"retirada_por_terceiro":true,"retirante_nome":"Maria"}',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://192.168.1.10:5555/takeout/confirm/legacy",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          request_id: "req-legacy-2",
          event_id: "ev-legacy",
          participant_id: "lp-1",
          device_id: "dev-1",
          payload_json: '{"retirada_por_terceiro":true,"retirante_nome":"Maria"}',
        }),
      })
    );
  });
});
