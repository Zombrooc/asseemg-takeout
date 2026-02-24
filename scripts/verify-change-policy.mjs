#!/usr/bin/env node
/**
 * Verifies that changes to sensitive config files are accompanied by docs or tests.
 * Exit 1 if a sensitive file was changed but no doc/test/harness is in the changed list.
 * Input: list of changed files, one per line, from stdin or env GIT_DIFF_NAMES (newline-sep).
 * Usage: git diff --name-only $BASE_REF | node scripts/verify-change-policy.mjs
 *    or: GIT_DIFF_NAMES="apps/native/metro.config.js" node scripts/verify-change-policy.mjs
 */
import { createInterface } from "readline";

const SENSITIVE = [
  "apps/native/metro.config.js",
  "apps/native/babel.config.js",
  "apps/native/babel.config.ts",
  "apps/native/tsconfig.json",
  "apps/native/app.json",
  "apps/native/app.config.js",
  "apps/native/app.config.ts",
  "apps/web/src-tauri/tauri.conf.json",
  "apps/native/package.json",
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
];

const ALLOWED_PREFIXES = [
  "docs/incidents/",
  "docs/rules/",
  "docs/skills/",
  "apps/native/__tests__/",
  "scripts/test-harness/",
];

function isSensitive(file) {
  return SENSITIVE.some((s) => file === s || file.endsWith("/" + s));
}

function isAllowed(file) {
  return ALLOWED_PREFIXES.some((p) => file.startsWith(p)) || /__tests__|regression|\.test\.(ts|tsx|js|jsx)$/.test(file);
}

async function readStdinLines() {
  const rl = createInterface({ input: process.stdin });
  const lines = [];
  for await (const line of rl) lines.push(line.trim());
  return lines.filter(Boolean);
}

async function main() {
  let files = [];
  if (process.env.GIT_DIFF_NAMES) {
    files = process.env.GIT_DIFF_NAMES.split("\n").map((s) => s.trim()).filter(Boolean);
  } else {
    files = await readStdinLines();
  }

  const sensitiveChanged = files.filter(isSensitive);
  const hasDocOrTest = files.some(isAllowed);

  if (sensitiveChanged.length === 0) {
    process.exit(0);
    return;
  }
  if (hasDocOrTest) {
    process.exit(0);
    return;
  }

  console.error(
    "verify-change-policy: Alterações em arquivos sensíveis exigem doc ou teste no mesmo diff."
  );
  console.error("Arquivos sensíveis alterados:", sensitiveChanged.join(", "));
  console.error(
    "Adicione ao menos um de: docs/incidents/**, **/__tests__/**, **/regression/**, scripts/test-harness/**"
  );
  process.exit(1);
}

main();
