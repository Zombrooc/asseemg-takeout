import { nextReconnectDelay, realtimeConfig } from "@/lib/takeout-realtime";

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
