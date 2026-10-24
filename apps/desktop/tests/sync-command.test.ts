import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { openMemoryDatabase, nowIso } from "../src/main/db";
import { createTakeoutServer, startTakeoutServer } from "../src/main/server";

const runningServers: Array<ReturnType<typeof createTakeoutServer>> = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.close()));
});

async function pairedServer() {
  const db = openMemoryDatabase();
  const server = createTakeoutServer({ db, baseUrl: "http://127.0.0.1:5555" });
  runningServers.push(server);
  await startTakeoutServer(server, 0);
  const address = server.httpServer.address();
  if (!address || typeof address === "string") throw new Error("server address unavailable");
  const base = `http://127.0.0.1:${address.port}`;
  const pairing = await fetch(`${base}/pair/info`).then((response) => response.json()) as { pairingToken: string };
  const paired = await fetch(`${base}/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: "mobile-1", pairing_token: pairing.pairingToken, operator_alias: "Staff" }),
  }).then((response) => response.json()) as { access_token: string };
  return { db, server, base, port: address.port, token: paired.access_token };
}

function waitForMessage(socket: WebSocket, type: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), 3_000);
    const listener = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (message.type !== type) return;
      clearTimeout(timeout);
      socket.off("message", listener);
      resolve(message);
    };
    socket.on("message", listener);
  });
}

describe("authoritative sync commands", () => {
	it("replays global sequence numbers without assuming they are consecutive per event", async () => {
		const { db, port, token } = await pairedServer();
		const insert = db.prepare("INSERT INTO event_log(event_id,type,payload_json,created_at) VALUES(?,?,?,?)");
		insert.run("event-1", "participant_checked_in", JSON.stringify({ ticket_id: "ticket-1" }), 1);
		insert.run("event-other", "participant_checked_in", JSON.stringify({ ticket_id: "other" }), 2);
		insert.run("event-1", "participant_checkin_reverted", JSON.stringify({ ticket_id: "ticket-1" }), 3);
		const expected = db.prepare("SELECT seq FROM event_log WHERE event_id='event-1' ORDER BY seq").all() as Array<{ seq: number }>;

		const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
		await new Promise<void>((resolve) => socket.once("open", () => resolve()));
		socket.send(JSON.stringify({ type: "connection.hello", protocolVersion: 1, token, deviceId: "mobile-1" }));
		await waitForMessage(socket, "connection.ready");
		const replayed: number[] = [];
		const completed = new Promise<Record<string, unknown>>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("timeout waiting for replay")), 3_000);
			socket.on("message", (raw) => {
				const message = JSON.parse(raw.toString()) as Record<string, unknown>;
				if (message.event_id === "event-1" && typeof message.seq === "number") replayed.push(message.seq);
				if (message.type === "sync.completed") {
					clearTimeout(timeout);
					resolve(message);
				}
			});
		});
		socket.send(JSON.stringify({ type: "sync.subscribe", eventId: "event-1", lastSeq: 0 }));

		expect(await completed).toMatchObject({ latestSeq: expected[1]?.seq });
		expect(replayed).toEqual(expected.map(({ seq }) => seq));
		expect(replayed[1] - replayed[0]).toBeGreaterThan(1);
		socket.close();
	});

  it("rejects reusing an HTTP operation id for a different ticket", async () => {
    const { db, base, token } = await pairedServer();
    const timestamp = nowIso();
    db.prepare("INSERT INTO events(event_id,name,imported_at,source_type) VALUES(?,?,?,?)").run("event-1", "Event", timestamp, "json_sync");
    db.prepare("INSERT INTO participants(id,event_id,name) VALUES(?,?,?)").run("person-1", "event-1", "Ana");
    db.prepare("INSERT INTO tickets(id,participant_id) VALUES(?,?)").run("ticket-1", "person-1");
    db.prepare("INSERT INTO tickets(id,participant_id) VALUES(?,?)").run("ticket-2", "person-1");
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    expect((await fetch(`${base}/takeout/confirm`, { method: "POST", headers, body: JSON.stringify({ request_id: "operation-1", ticket_id: "ticket-1" }) })).status).toBe(200);
    const mismatched = await fetch(`${base}/takeout/confirm`, { method: "POST", headers, body: JSON.stringify({ request_id: "operation-1", ticket_id: "ticket-2" }) });

    expect(mismatched.status).toBe(409);
    expect(await mismatched.json()).toMatchObject({ code: "IDEMPOTENCY_PAYLOAD_MISMATCH" });
		const changedPayload = await fetch(`${base}/takeout/confirm`, { method: "POST", headers, body: JSON.stringify({ request_id: "operation-1", ticket_id: "ticket-1", payload_json: "{\"proxy\":true}" }) });
		expect(changedPayload.status).toBe(409);
		expect(await changedPayload.json()).toMatchObject({ code: "IDEMPOTENCY_PAYLOAD_MISMATCH" });
  });

  it("executes and deduplicates legacy_csv check-in over WebSocket", async () => {
    const { db, port, token } = await pairedServer();
    const timestamp = nowIso();
    db.prepare("INSERT INTO events(event_id,name,imported_at,source_type) VALUES(?,?,?,?)").run("legacy-event", "Legacy", timestamp, "legacy_csv");
    db.prepare("INSERT INTO legacy_participants(id,event_id,bib_number,full_name,cpf_digits,birth_date_iso,raw_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .run("legacy-1", "legacy-event", 1, "Ana", "", "1990-01-01", "{}", timestamp, timestamp);
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await new Promise<void>((resolve) => socket.once("open", () => resolve()));
    socket.send(JSON.stringify({ type: "connection.hello", protocolVersion: 1, token, deviceId: "mobile-1" }));
    expect(await waitForMessage(socket, "connection.ready")).toMatchObject({ serverInstanceId: expect.any(String) });
    const command = { type: "command.execute", protocolVersion: 1, operationId: "11111111-1111-4111-8111-111111111111", eventId: "legacy-event", action: "confirm_checkin", payload: { sourceType: "legacy_csv", participantId: "legacy-1" } };
    socket.send(JSON.stringify(command));
    expect(await waitForMessage(socket, "command.ack")).toMatchObject({ status: "CONFIRMED" });
    socket.send(JSON.stringify(command));
    expect(await waitForMessage(socket, "command.ack")).toMatchObject({ duplicate: true });
    expect(db.prepare("SELECT COUNT(*) count FROM legacy_checkins WHERE request_id=?").get(command.operationId)).toMatchObject({ count: 1 });
    socket.close();
  });
});
