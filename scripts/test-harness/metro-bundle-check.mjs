#!/usr/bin/env node
/**
 * Runs Metro/Expo export and fails if "Unable to resolve" appears in output.
 * Cross-platform: uses Node spawn and path; no bash-only.
 * See docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md
 */
import { spawn } from "child_process";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const TIMEOUT_MS = 120_000;
const FAIL_PATTERN = "Unable to resolve";

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Timeout after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code, signal) => {
      clearTimeout(timer);
      const out = stdout + stderr;
      if (out.includes(FAIL_PATTERN)) {
        reject(new Error(`Output contained "${FAIL_PATTERN}":\n${out.slice(-2000)}`));
        return;
      }
      if (code !== 0 && code != null) {
        reject(new Error(`Process exited ${code}${signal ? ` (${signal})` : ""}\n${out.slice(-1500)}`));
        return;
      }
      resolve({ stdout, stderr, code });
    });
  });
}

async function main() {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const args = ["--filter", "native", "exec", "expo", "export", "--platform", "android"];
  try {
    await run(pnpm, args, ROOT);
    console.log("metro-bundle-check: OK (no Unable to resolve in output)");
  } catch (err) {
    console.error("metro-bundle-check FAILED:", err.message);
    process.exit(1);
  }
}

main();
