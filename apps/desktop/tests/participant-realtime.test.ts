import { describe, expect, it } from "vitest";
import {
	patchDesktopParticipants,
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

	it("applies the complete participant snapshot received over WebSocket", () => {
		const current = [{
			id: "participant-1",
			ticketId: "ticket-1",
			name: "Nome antigo",
			cpf: "000",
			birthDate: "1990-01-01",
			shirtSize: "P",
			team: "Equipe antiga",
			checkinDone: false,
		}];

		expect(patchDesktopParticipants(current, {
			type: "participant_updated",
			source_type: "json_sync",
			participant_id: "participant-1",
			ticket_id: "ticket-1",
			participant: {
				...current[0],
				qrCode: "ticket-1",
				name: "Nome novo",
				cpf: "111",
				birthDate: "2000-02-02",
				shirtSize: "M",
				team: "Equipe nova",
			},
		})).toEqual([{ ...current[0], qrCode: "ticket-1", name: "Nome novo", cpf: "111", birthDate: "2000-02-02", shirtSize: "M", team: "Equipe nova" }]);
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
