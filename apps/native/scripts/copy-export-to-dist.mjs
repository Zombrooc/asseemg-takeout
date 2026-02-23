#!/usr/bin/env node
/**
 * Copies apps/native/dist (Expo export output) to repo root dist/native/expo-export-{platform}.
 * Usage: node scripts/copy-export-to-dist.mjs android|ios
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const platform = process.argv[2] || "android";
const src = join(root, "dist");
const dest = join(root, "..", "..", "dist", "native", `expo-export-${platform}`);

if (!existsSync(src)) {
  console.error("No dist/ found. Run expo export first.");
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
if (existsSync(dest)) rmSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("Copied to", dest);
