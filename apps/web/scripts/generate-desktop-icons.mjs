import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appRoot, "..", "..");

const sourceLogo = path.join(repoRoot, "assets", "asseemg.png");
const tauriIconsDir = path.join(appRoot, "src-tauri", "icons");
const preparedSource = path.join(tauriIconsDir, "_source-desktop.png");

const matte = { r: 245, g: 245, b: 245, alpha: 1 };

async function prepareDesktopSource() {
  if (!fs.existsSync(sourceLogo)) {
    throw new Error(`Source logo not found: ${sourceLogo}`);
  }

  const input = sharp(sourceLogo, { failOn: "error" });
  const meta = await input.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Unable to read source logo dimensions.");
  }

  const size = Math.max(meta.width, meta.height);
  const left = Math.floor((size - meta.width) / 2);
  const top = Math.floor((size - meta.height) / 2);

  const base = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: sourceLogo, left, top }]);

  const { data, info } = await base
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Keep original alpha while filling hidden RGB with matte for better cross-platform compositing.
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha >= 1) continue;
    data[i] = Math.round(data[i] * alpha + matte.r * (1 - alpha));
    data[i + 1] = Math.round(data[i + 1] * alpha + matte.g * (1 - alpha));
    data[i + 2] = Math.round(data[i + 2] * alpha + matte.b * (1 - alpha));
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(preparedSource);

  console.log(`Prepared icon source: ${path.relative(repoRoot, preparedSource)}`);
}

function runTauriIcon() {
  const relPrepared = path.relative(appRoot, preparedSource);
  const pnpmRunner = process.env.npm_execpath;
  if (!pnpmRunner) {
    throw new Error("npm_execpath is unavailable; run this script via pnpm.");
  }
  const result = spawnSync(pnpmRunner, ["exec", "tauri", "icon", relPrepared], {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`tauri icon failed with exit code ${result.status}`);
  }
}

await prepareDesktopSource();
runTauriIcon();
