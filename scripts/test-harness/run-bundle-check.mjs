#!/usr/bin/env node
/**
 * Entry point for CI: runs metro-bundle-check and exits with 1 on failure.
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const script = path.join(__dirname, "metro-bundle-check.mjs");

const proc = spawn(process.execPath, [script], {
  stdio: "inherit",
  shell: false,
});
proc.on("close", (code) => {
  process.exit(code ?? 0);
});
