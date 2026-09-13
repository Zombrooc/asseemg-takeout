import { describe, expect, it } from "vitest";
import {
	readShowParticipantQr,
	SHOW_PARTICIPANT_QR_STORAGE_KEY,
	shouldReloadParticipants,
} from "../src/renderer/src/App";

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

describe("participant QR display setting", () => {
	it("is disabled when unset and reads the persisted value", () => {
		const storage = new Map<string, string>();
		const fakeStorage = {
			getItem: (key: string) => storage.get(key) ?? null,
		};

		expect(readShowParticipantQr(fakeStorage)).toBe(false);
		storage.set(SHOW_PARTICIPANT_QR_STORAGE_KEY, "true");
		expect(readShowParticipantQr(fakeStorage)).toBe(true);
	});
});
