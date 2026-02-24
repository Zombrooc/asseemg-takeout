#!/usr/bin/env node
/**
 * Non-regression check for Tauri desktop blank UI caused by absolute asset paths.
 * Validates that web build output references relative assets (./assets/*).
 * See docs/incidents/2026-02-24-tauri-blank-ui-after-build.md
 */
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const WEB_DIST_INDEX = path.join(ROOT, "apps", "web", "dist", "index.html");

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
    });

    let output = "";
    proc.stdout?.on("data", (d) => (output += d.toString()));
    proc.stderr?.on("data", (d) => (output += d.toString()));

    proc.on("error", reject);
    proc.on("close", (code, signal) => {
      if (code !== 0) {
        reject(new Error(`Process exited ${code}${signal ? ` (${signal})` : ""}\n${output}`));
        return;
      }
      resolve(output);
    });
  });
}

async function main() {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  await run(pnpm, ["--filter", "web", "run", "build"], ROOT);

  const html = await fs.readFile(WEB_DIST_INDEX, "utf8");
  if (/["']\/assets\//.test(html)) {
    throw new Error(
      "Regression detected: dist/index.html contains absolute '/assets/' paths, which can break Tauri release UI."
    );
  }
  if (!/["']\.\/assets\//.test(html)) {
    throw new Error(
      "Regression detected: dist/index.html does not contain relative './assets/' paths."
    );
  }

  console.log("tauri-web-build-regression: OK");
}

main().catch((err) => {
  console.error("tauri-web-build-regression FAILED:", err.message);
  process.exit(1);
});
