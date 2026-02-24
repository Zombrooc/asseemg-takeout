# Arquitetura do Monorepo

## Visão geral

- `apps/web`: UI desktop (React + Vite + TanStack Router).
- `apps/web/src-tauri`: app Tauri + API HTTP Rust (Axum + SQLite rusqlite), fonte de verdade local.
- `apps/native`: cliente Expo/React Native na LAN.
- `apps/server`: stub técnico (não hospeda API takeout).
- `packages/api`: contratos compartilhados de API/realtime.
- `packages/env`: validação de variáveis por ambiente (web/native/server).
- `packages/db`: Prisma/libsql (suporte complementar, fora do core takeout).
- `packages/config`: configs compartilhadas de TypeScript.

## Camadas (minimal moves)

1. UI: telas/componentes web/native.
2. Feature: fluxos de pareamento, eventos, confirmação.
3. Data/Services: clients HTTP/WS, fila offline, locks.
4. Infra: Tauri + Axum + SQLite.

## Boundaries

1. Apps não importam arquivos internos de outros apps.
2. Compartilhamento entre apps ocorre por `packages/*`.
3. `packages/api` é a fonte única para contratos de API/realtime.
4. `apps/server` não pode receber regras de negócio takeout.
