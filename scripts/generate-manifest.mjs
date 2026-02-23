#!/usr/bin/env node
/**
 * Generates or updates build-manifest.json with schema version, env, optional timings/artifacts,
 * and results of check-types and native test. Cross-platform.
 */
import { execSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);

const MANIFEST_SCHEMA_VERSION = "1.0";
const MANIFEST_FILENAME = "build-manifest.json";

function run(cmd, opts = {}) {
  try {
    const result = execSync(cmd, { encoding: "utf8", cwd: root, stdio: opts.capture ? "pipe" : "inherit", ...opts });
    return { ok: true, out: opts.capture ? (result ?? "") : undefined };
  } catch (e) {
    return { ok: false, out: opts.capture ? (e.stdout ?? "") : undefined };
  }
}

function runCapture(cmd) {
  const r = run(cmd, { capture: true });
  const out = (r.out ?? "").trim();
  return r.ok ? out : null;
}

async function getVersions() {
  const node = process.version;
  let pnpm = null;
  let cargo = null;
  let rustc = null;
  try {
    pnpm = runCapture("pnpm -v");
  } catch (_) {}
  try {
    cargo = runCapture("cargo -V");
    rustc = runCapture("rustc -V");
  } catch (_) {}
  return { node, pnpm, cargo, rustc };
}

let commit = null;
try {
  commit = runCapture("git rev-parse HEAD");
} catch (_) {}

const generatedAt = new Date().toISOString();
const versions = await getVersions();

let artifacts = {};
try {
  const { spawn } = await import("node:child_process");
  const child = spawn(process.execPath, [join(__dirname, "collect-artifacts.mjs")], { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  await new Promise((res, rej) => {
    child.on("close", (c) => (c === 0 ? res() : rej(new Error("collect-artifacts failed"))));
  });
  artifacts = JSON.parse(out || "{}");
} catch (_) {
  // dist may not exist yet
}

const checkTypesResult = run("pnpm run check-types", { capture: true }).ok ? "pass" : "fail";
const nativeTestResult = run("pnpm --filter native run test", { capture: true }).ok ? "pass" : "fail";

// Optional: merge BUILD_TIMINGS from env (JSON object)
let timings = {};
try {
  if (process.env.BUILD_TIMINGS) timings = JSON.parse(process.env.BUILD_TIMINGS);
} catch (_) {}

const manifest = {
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  generatedAt,
  commit: commit ?? null,
  os: process.platform,
  versions: { node: versions.node, pnpm: versions.pnpm, cargo: versions.cargo, rustc: versions.rustc },
  timings,
  artifacts,
  checkTypes: checkTypesResult,
  nativeTest: nativeTestResult,
};

const outPath = join(root, MANIFEST_FILENAME);
await mkdir(join(root), { recursive: true });
await writeFile(outPath, JSON.stringify(manifest, null, 2), "utf8");
console.log("Wrote", outPath);
