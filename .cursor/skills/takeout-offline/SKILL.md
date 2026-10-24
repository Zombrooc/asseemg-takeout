---
name: takeout-offline
description: Implementa, revisa e documenta o fluxo atual do ASSEEMG Retira em Electron, Expo, pairing, importação, check-in, locks, outbox e realtime LAN.
---

# Skill: Takeout Offline

Leia primeiro `AGENTS.md`, `docs/system-current-state.md` e `docs/local-first-sync.md`. A implementação atual é Electron em `apps/desktop`; referências Tauri em `apps/web` não devem ser usadas para novas alterações.

## Desktop

- API Express + `ws` no processo principal, bind `0.0.0.0:5555`.
- SQLite em `app.getPath("userData")`, WAL, foreign keys e migrações aditivas.
- Pareamento por token de 15 minutos e `access_token` por dispositivo/alias.
- Importações: JSON `/sync/import` e CSV legado `/admin/import/legacy-csv`.
- Check-in autoritativo e idempotente por `request_id`; conflito por ticket ou participante legado.
- Locks por participante com TTL de 30 s; são coordenação, não garantia de integridade.

## Mobile

- QR ou URL/token manual; credenciais em SecureStore.
- Snapshot em SQLite local; chave lógica `eventId + sourceType + entityId`.
- Outbox durável: `pending` → `sending` → `acknowledged`, ou `conflict`/`failed`; lease de envio de 30 s e retry com backoff.
- Um `TakeoutSyncManager` por dispositivo mantém WS, heartbeat, reconnect, comandos e subscriptions.
- Eventos e cursor são persistidos juntos; timeout repete a mesma operação.

## Não fazer

- Não usar `apps/server` como backend takeout.
- Não reativar `/sync/pull`/`push` sem decisão de produto; hoje retornam 503 offline.
- Não tratar cache mobile ou estado `pending` como confirmação final.
- Não gerar novo `request_id` no retry, nem apagar conflito/falha automaticamente.
- Não logar token, CPF, PII ou payload integral.

## Mudanças e validação

Para bugs, escreva primeiro o teste de regressão. Para features, cubra sucesso, retry, conflito e offline quando aplicável. Valide desktop com `pnpm --dir apps/desktop typecheck`, `lint`, `test` e, para mudança de build, `build`; valide mobile com `pnpm --dir apps/native test`.

Se o comportamento ou contrato mudar, atualize a documentação de estado atual e os contratos em `packages/api` junto com os consumidores.
