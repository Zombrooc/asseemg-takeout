# Runbook de Incidentes (Takeout Offline)

## 1) Metro não resolve módulo

Sintoma:
- `Unable to resolve .../dist/...`

Ações:
1. Validar `apps/native/metro.config.js`.
2. Rodar `pnpm --filter native run test`.
3. Rodar `node scripts/test-harness/run-bundle-check.mjs`.
4. Se necessário: `expo start --clear`.

## 2) Falha em pareamento mobile

Sintoma:
- `/pair` retorna 401/erro de token.

Ações:
1. No desktop, renovar token (`/pair/renew`).
2. Verificar URL LAN correta (`/network/addresses`).
3. Confirmar acesso local `http://<ip>:5555/health`.

## 3) Build Tauri falhando

Ações Linux:
1. Validar dependências de sistema (`webkit2gtk`, `gtk3`, `ayatana-appindicator3`, `librsvg2`).
2. Rodar `cargo test --manifest-path apps/web/src-tauri/Cargo.toml`.
3. Rodar `pnpm --filter web run desktop:build`.

Ações Windows:
1. Validar toolchain Rust e Tauri CLI.
2. Rodar smoke: `pnpm --filter web run tauri -- --version`.

## 4) Prisma/DB inconsistente

Ações:
1. Confirmar `DATABASE_URL` para `packages/db`.
2. Rodar `pnpm run db:generate`.
3. Rodar `pnpm run db:migrate` (ambiente de desenvolvimento).
4. Lembrar: core takeout usa rusqlite no Tauri.

## 5) Realtime não atualiza

Ações:
1. Verificar WS `GET /ws?event_id=...`.
2. Confirmar heartbeats chegando.
3. Validar reconnect/backoff no cliente.
4. Validar geração de eventos no backend (`participant_checked_in`, `lock_*`).
