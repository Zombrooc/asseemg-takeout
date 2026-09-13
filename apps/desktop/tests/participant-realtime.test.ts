import { describe, expect, it } from "vitest";
import { shouldReloadParticipants } from "../src/renderer/src/App";

describe("desktop participant realtime updates", () => {
	it("reloads after a check-in received from another device", () => {
		expect(
			shouldReloadParticipants(JSON.stringify({ type: "participant_checked_in" })),
		).toBe(true);
	});

	it("ignores heartbeat and malformed messages", () => {
		expect(shouldReloadParticipants(JSON.stringify({ type: "heartbeat" }))).toBe(false);
		expect(shouldReloadParticipants("not json")).toBe(false);
	});
});
