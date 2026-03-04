import {
  getRealtimeInvalidation,
  nextReconnectDelay,
  parseRealtimeMessageData,
  realtimeConfig,
} from "@/lib/takeout-realtime";

describe("takeout realtime reconnect policy", () => {
  it("grows reconnect delay using backoff", () => {
    expect(nextReconnectDelay(realtimeConfig.INITIAL_RECONNECT_DELAY_MS)).toBeGreaterThan(
      realtimeConfig.INITIAL_RECONNECT_DELAY_MS
    );
  });

  it("caps reconnect delay at max", () => {
    expect(nextReconnectDelay(realtimeConfig.MAX_RECONNECT_DELAY_MS)).toBe(
      realtimeConfig.MAX_RECONNECT_DELAY_MS
    );
    expect(nextReconnectDelay(realtimeConfig.MAX_RECONNECT_DELAY_MS * 2)).toBe(
      realtimeConfig.MAX_RECONNECT_DELAY_MS
    );
  });
});

describe("realtime invalidation policy", () => {
  it("invalidates participants and audit for participant_checked_in", () => {
    expect(
      getRealtimeInvalidation({
        type: "participant_checked_in",
        ticket_id: "seat-1",
      })
    ).toEqual({
      invalidateParticipants: true,
      invalidateAudit: true,
      invalidateEvents: false,
    });
  });

  it("invalidates only participants for participant_updated", () => {
    expect(
      getRealtimeInvalidation({
        type: "participant_updated",
        participant_id: "seat-1",
      })
    ).toEqual({
      invalidateParticipants: true,
      invalidateAudit: false,
      invalidateEvents: false,
    });
  });

  it("invalidates events list for events_list_changed", () => {
    expect(getRealtimeInvalidation({ type: "events_list_changed" })).toEqual({
      invalidateParticipants: false,
      invalidateAudit: false,
      invalidateEvents: true,
    });
  });
});

describe("realtime message parser", () => {
  it("parses string payload", () => {
    expect(
      parseRealtimeMessageData(
        JSON.stringify({
          type: "participant_updated",
          participant_id: "seat-1",
        })
      )
    ).toEqual({
      type: "participant_updated",
      participant_id: "seat-1",
    });
  });

  it("accepts object payload", () => {
    expect(
      parseRealtimeMessageData({
        type: "participant_updated",
        participant_id: "seat-2",
      })
    ).toEqual({
      type: "participant_updated",
      participant_id: "seat-2",
    });
  });

  it("returns null for invalid payload", () => {
    expect(parseRealtimeMessageData("not-json")).toBeNull();
    expect(parseRealtimeMessageData(42)).toBeNull();
    expect(parseRealtimeMessageData({ nope: true })).toBeNull();
  });
});
