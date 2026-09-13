import { afterEach, describe, expect, it } from "vitest";
import { openMemoryDatabase } from "../src/main/db";
import {
  createTakeoutServer,
  selectPrimaryAddress,
  startTakeoutServer,
} from "../src/main/server";

const runningServers: Array<ReturnType<typeof createTakeoutServer>> = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.close()));
});

describe("takeout server", () => {
  it("prefers the interface selected by the default LAN route over Host-Only adapters", () => {
    const addresses = [
      { interfaceName: "Ethernet 2", ip: "192.168.56.1", url: "http://192.168.56.1:5555", isPrimary: false },
      { interfaceName: "Wi-Fi", ip: "192.168.0.128", url: "http://192.168.0.128:5555", isPrimary: false },
    ];

    expect(selectPrimaryAddress(addresses, { ip: "192.168.0.128" })?.ip).toBe("192.168.0.128");
  });

  it("avoids a virtual adapter when no default route is available", () => {
    const addresses = [
      { interfaceName: "Ethernet 2", ip: "192.168.56.1", url: "http://192.168.56.1:5555", isPrimary: false },
      { interfaceName: "Wi-Fi", ip: "192.168.0.128", url: "http://192.168.0.128:5555", isPrimary: false },
    ];

    expect(selectPrimaryAddress(addresses, null)?.ip).toBe("192.168.0.128");
  });

  it("binds the HTTP server to all IPv4 interfaces", async () => {
    const server = createTakeoutServer({ db: openMemoryDatabase(), baseUrl: "http://192.168.1.50:5555" });
    runningServers.push(server);
    await startTakeoutServer(server, 0);

    const address = server.httpServer.address();
    expect(address).not.toBeNull();
    expect(typeof address === "object" && address !== null ? address.address : "").toBe("0.0.0.0");
  });

  it("exposes health and LAN pairing information", async () => {
    const server = createTakeoutServer({ db: openMemoryDatabase(), baseUrl: "http://192.168.1.50:5555" });
    runningServers.push(server);
    await startTakeoutServer(server, 0);
    const address = server.httpServer.address();
    if (!address || typeof address === "string") throw new Error("server address unavailable");

    const health = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(await health.json()).toEqual({ status: "ok" });
    const pairing = await fetch(`http://127.0.0.1:${address.port}/pair/info`);
    expect(await pairing.json()).toMatchObject({ baseUrl: "http://192.168.1.50:5555" });
  });

  it("creates an empty event from the new event form", async () => {
    const db = openMemoryDatabase();
    const server = createTakeoutServer({ db, baseUrl: "http://127.0.0.1:5555" });
    runningServers.push(server);
    await startTakeoutServer(server, 0);
    const address = server.httpServer.address();
    if (!address || typeof address === "string") throw new Error("server address unavailable");

    const response = await fetch(`http://127.0.0.1:${address.port}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Corrida de Domingo", startDate: "2026-09-20" }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      name: "Corrida de Domingo",
      startDate: "2026-09-20",
      sourceType: "manual",
	    });
	});

	it("imports qrcode from legacy CSV and exposes it to the scanner", async () => {
		const db = openMemoryDatabase();
		const server = createTakeoutServer({ db, baseUrl: "http://127.0.0.1:5555" });
		runningServers.push(server);
		await startTakeoutServer(server, 0);
		const address = server.httpServer.address();
		if (!address || typeof address === "string") throw new Error("server address unavailable");

		const form = new FormData();
		form.append("eventId", "event-qr");
		form.append("eventName", "Corrida QR");
		form.append("eventStartDate", "2026-09-20");
		form.append("file", new File(["Nome;N\u00famero;QR Code\nAna;12;qr-ana-12\n"], "participants.csv", { type: "text/csv" }));
		const imported = await fetch(`http://127.0.0.1:${address.port}/admin/import/legacy-csv`, { method: "POST", body: form });
		expect(imported.status).toBe(200);

		const participants = await fetch(`http://127.0.0.1:${address.port}/events/event-qr/legacy-participants`);
		expect(await participants.json()).toMatchObject([{ name: "Ana", qrCode: "qr-ana-12" }]);
	});

	it("keeps legacy CSV imports compatible without qrcode", async () => {
		const db = openMemoryDatabase();
		const server = createTakeoutServer({ db, baseUrl: "http://127.0.0.1:5555" });
		runningServers.push(server);
		await startTakeoutServer(server, 0);
		const address = server.httpServer.address();
		if (!address || typeof address === "string") throw new Error("server address unavailable");

		const form = new FormData();
		form.append("eventName", "Corrida antiga");
		form.append("eventStartDate", "2026-09-20");
		form.append("file", new File(["Nome;N\u00famero\nAna;12\n"], "participants.csv", { type: "text/csv" }));
		const imported = await fetch(`http://127.0.0.1:${address.port}/admin/import/legacy-csv`, { method: "POST", body: form });
		expect(imported.status).toBe(200);
		expect((await imported.json()).imported).toBe(1);
	});

	it("finds a participant when QR search receives a Wix URL", async () => {
		const db = openMemoryDatabase();
		const server = createTakeoutServer({ db, baseUrl: "http://127.0.0.1:5555" });
		runningServers.push(server);
		await startTakeoutServer(server, 0);
		const address = server.httpServer.address();
		if (!address || typeof address === "string") throw new Error("server address unavailable");

		const imported = await fetch(`http://127.0.0.1:${address.port}/sync/import`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				eventId: "event-wix",
				event: { name: "Corrida Wix", startDate: "2026-09-20" },
				participants: [
					{
						seatId: "participant-wix",
						participantName: "Ana Wix",
						ticketId: "order-123",
						qrCode: "30N8-40QJ-DQW1P",
					},
				],
			}),
		});
		expect(imported.status).toBe(200);

		const wixUrl = "https://www.wixevents.com/check-in/30N8-40QJ-DQW1P,2221e781-4179-4ed3-998f-159ce621380a";
		const result = await fetch(
			`http://127.0.0.1:${address.port}/events/event-wix/participants/search?${new URLSearchParams({ q: wixUrl, mode: "qr" })}`,
		);
		expect(await result.json()).toMatchObject([{ id: "participant-wix", qrCode: "30N8-40QJ-DQW1P" }]);
	});
});
