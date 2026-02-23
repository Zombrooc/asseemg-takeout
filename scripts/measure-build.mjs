#!/usr/bin/env node
/**
 * Measures execution time of a command. Usage: node scripts/measure-build.mjs <label> -- <command...>
 * Writes timing to stdout as JSON line: {"label":"<label>","ms":<number>}
 * and exit code = command exit code.
 */
import { spawn } from "node:child_process";
import { argv } from "node:process";

const args = argv.slice(2);
const dashDash = args.indexOf("--");
if (dashDash === -1) {
  console.error("Usage: measure-build.mjs <label> -- <command...>");
  process.exit(1);
}
const label = args.slice(0, dashDash).join(" ");
const cmdArgs = args.slice(dashDash + 1);
const [cmd, ...rest] = cmdArgs;
if (!cmd) {
  console.error("Usage: measure-build.mjs <label> -- <command...>");
  process.exit(1);
}

const start = Date.now();
const child = spawn(cmd, rest, {
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("close", (code) => {
  const ms = Date.now() - start;
  console.log(JSON.stringify({ label, ms, exitCode: code ?? null }));
  process.exit(code ?? 0);
});
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
