import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../src/renderer/src/api";

afterEach(() => vi.restoreAllMocks());

describe("renderer API request headers", () => {
	it("does not label CSV FormData as JSON", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ imported: 1, errors: [] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		await api.importCsv({
			eventName: "Corrida",
			eventStartDate: "2026-09-20",
			file: new File(["Nome;Número\nAna;12\n"], "participantes.csv", {
				type: "text/csv",
			}),
		});

		const [, init] = fetchMock.mock.calls[0] ?? [];
		expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
		expect(init?.body).toBeInstanceOf(FormData);
	});
});
