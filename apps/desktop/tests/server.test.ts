import { afterEach, describe, expect, it } from "vitest";
import { openMemoryDatabase } from "../src/main/db";
import { createTakeoutServer, startTakeoutServer } from "../src/main/server";

const runningServers: Array<ReturnType<typeof createTakeoutServer>> = [];

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.close()));
});

describe("takeout server", () => {
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
});
