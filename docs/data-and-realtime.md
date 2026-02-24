# Dados e Realtime

## Fonte de verdade

Core takeout local usa SQLite (`rusqlite`) dentro do processo Tauri.

## Papel do Prisma (`packages/db`)

`packages/db` é camada auxiliar para workflows específicos, não substitui o core do takeout offline.

## Contratos compartilhados

Tipos de API/WS vivem em `packages/api/src/takeout-contracts.ts` e são consumidos por web/native.

## Realtime

1. Canal WS: `/ws`.
2. Eventos principais:
- `participant_checked_in`
- `lock_acquired`
- `lock_released`
- `events_list_changed`
- `heartbeat`
3. Clientes usam reconnect com backoff e timeout de heartbeat.
