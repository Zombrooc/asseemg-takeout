#!/usr/bin/env node
/**
 * Starts Vite and waits for http://localhost:3001 before exiting.
 * Tauri's beforeDevCommand runs this; when it exits, Tauri opens the window.
 * The Vite process is spawned detached so it keeps running after this script exits.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DEV_URL = "http://localhost:3001";
const MAX_WAIT_MS = 60000;
const POLL_MS = 400;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(scriptDir, "..");

const vite = spawn("pnpm", ["run", "dev"], {
  cwd: webRoot,
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});

vite.unref();

vite.stdout?.on("data", (d) => process.stdout.write(d));
vite.stderr?.on("data", (d) => process.stderr.write(d));

vite.on("error", (err) => {
  console.error("Failed to start Vite:", err);
  process.exit(1);
});

async function waitForUrl() {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(DEV_URL, { method: "HEAD" });
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  console.error("Timed out waiting for", DEV_URL);
  process.exit(1);
}

await waitForUrl();
process.exit(0);
