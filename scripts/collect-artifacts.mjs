#!/usr/bin/env node
/**
 * Collects sizes of build artifacts matching patterns. Output: JSON object with keys and total bytes.
 */
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");

/** Recursively sum file sizes under dir; optional suffix filter e.g. ".js". */
async function sumDirSizes(dir, suffix = null) {
  let total = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isFile()) {
        if (!suffix || e.name.endsWith(suffix)) total += (await stat(full).catch(() => null))?.size ?? 0;
      } else if (e.isDirectory()) {
        total += await sumDirSizes(full, suffix);
      }
    }
  } catch (_) {}
  return total;
}

/** Sum sizes of files in a single directory (no recursion). */
async function sumFilesInDir(dir, suffix = null) {
  let total = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (suffix && !e.name.endsWith(suffix)) continue;
      const s = await stat(join(dir, e.name)).catch(() => null);
      if (s) total += s.size;
    }
  } catch (_) {}
  return total;
}

const out = {};
const webAssets = join(root, "dist", "web", "assets");
out.webJs = await sumFilesInDir(webAssets, ".js");
out.webCss = await sumFilesInDir(webAssets, ".css");
const desktopArtifacts = join(root, "dist", "desktop", "artifacts");
out.desktopExe = await sumFilesInDir(desktopArtifacts, ".exe");
out.desktopMsi = await sumFilesInDir(desktopArtifacts, ".msi");
const nativeBundles = join(root, "dist", "native");
out.nativeBundle = await sumDirSizes(nativeBundles, ".js");
console.log(JSON.stringify(out));
