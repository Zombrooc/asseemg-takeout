import { describe, expect, it } from "vitest";
import { getEventMetadataErrors } from "../src/renderer/src/event-validation";

describe("event metadata validation", () => {
	it("returns an inline error for each missing required field", () => {
		expect(getEventMetadataErrors({ name: "", startDate: "" })).toEqual({
			name: "Informe o nome do evento.",
			startDate: "Informe a data inicial.",
		});
	});

	it("accepts a completed event", () => {
		expect(
			getEventMetadataErrors({
				name: "Corrida ASSEEMG",
				startDate: "2026-09-20",
			}),
		).toEqual({});
	});
});
