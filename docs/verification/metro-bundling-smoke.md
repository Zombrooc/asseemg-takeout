# Verificação: Metro bundling e smoke

## Cenários de teste

### 1. Dev flow (React Native)

- **Comando:** `pnpm dev` ou `pnpm --filter native dev`
- **Ação:** Aguardar Metro subir; verificar que não aparece "Unable to resolve" no terminal.
- **Sucesso:** Bundle concluído sem erro de resolução; opcional: app no emulador.

### 2. Build flow (native export)

- **Comando:** `pnpm --filter native run export:android` (ou export:ios)
- **Ação:** Export gera output em `apps/native/dist/` (ou conforme config).
- **Sucesso:** Exit code 0; nenhuma linha "Unable to resolve" na saída.

### 3. Build flow (Tauri / web)

- **Comando:** `pnpm --filter web run build`
- **Ação:** Vite build e, se aplicável, Tauri build.
- **Sucesso:** Exit code 0; artefatos em `apps/web/dist` e/ou target do Tauri.

### 4. Full build (monorepo)

- **Comando:** `pnpm run build`
- **Sucesso:** Todos os workspaces com task build concluem sem erro.

## Minimal smoke suite

Para validação rápida após alterações em config ou deps:

1. `pnpm install` (ou `pnpm install --frozen-lockfile` em CI)
2. `pnpm --filter native run test` — inclui invariantes e contract (config + regression)
3. `git diff --name-only <BASE> | node scripts/verify-change-policy.mjs` — se houver alteração em arquivo sensível, diff deve incluir doc ou teste

## Full suite

1. Install dependencies
2. Build: `pnpm run build`
3. Check types: `pnpm run check-types`
4. Test native: `pnpm --filter native run test`
5. Verify change policy: `git diff --name-only $BASE | node scripts/verify-change-policy.mjs`
6. Metro bundle check: `node scripts/test-harness/run-bundle-check.mjs`
7. Test Rust: `cargo test --manifest-path apps/web/src-tauri/Cargo.toml`
8. Generate build manifest: `pnpm run build:manifest`

## Windows / Linux

- Scripts em `scripts/` usam Node (path, spawn); compatíveis com Windows e Linux.
- No CI o workflow roda em ubuntu-latest. Smoke local em Windows: executar os mesmos comandos (pnpm, node); paths normalizados por Node.
