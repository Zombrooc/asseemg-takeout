import { describe, expect, it } from "vitest";
import { formatAuditCpf, resolveAuditEventId } from "../src/renderer/src/App";

describe("audit event context", () => {
	it("prioritizes the event currently open in the desktop", () => {
		expect(resolveAuditEventId({ eventId: "open-event" }, "selected-event")).toBe("open-event");
	});

	it("uses the selected event when opened from the dashboard", () => {
		expect(resolveAuditEventId(null, "selected-event")).toBe("selected-event");
	});

	it("formats the participant CPF shown in the audit table", () => {
		expect(formatAuditCpf("12345678900")).toBe("123.456.789-00");
	});
});
