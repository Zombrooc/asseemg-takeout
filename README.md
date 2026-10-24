# ASSEEMG Retira (Takeout Offline)

Sistema de retirada de kits em eventos de corrida, operando offline em LAN. O desktop Electron é a autoridade local (SQLite + API HTTP/WebSocket); o mobile Expo pareia e usa essa autoridade.

## Estado atual

- Desktop atual: `apps/desktop`.
- API: Express + `ws`, no mesmo processo Electron, `0.0.0.0:5555`.
- Banco autoritativo: `takeout.db` em `app.getPath("userData")`, SQLite WAL.
- Mobile: `apps/native`, com SecureStore para credenciais e SQLite para snapshots, cursores, projeção e outbox.
- Fontes suportadas: `json_sync` (ticket) e `legacy_csv` (participante legado), além de evento manual.
- Check-in: idempotente por UUID, com conflito explícito, auditoria e realtime.
- `/sync/pull` e `/sync/push`: placeholders offline, retornam `503`; não são integração externa ativa.

Documentação operacional: [`docs/system-current-state.md`](docs/system-current-state.md), [`docs/local-first-sync.md`](docs/local-first-sync.md), [`docs/runbook.md`](docs/runbook.md). Instruções para agentes: [`AGENTS.md`](AGENTS.md).

## Estrutura

```text
apps/desktop/     Electron + React/Vite + Express/ws + SQLite
apps/native/      Expo/React Native, cliente LAN e outbox offline
packages/api/     contratos HTTP/WebSocket compartilhados
apps/server/      stub técnico, sem regras takeout
apps/web/         legado/referência, fora do fluxo desktop atual
```

## Rodar e validar

Requisitos: Node 20–21, pnpm 10.28+, Rust apenas para ferramentas legadas; Android Studio/Xcode para mobile.

```bash
pnpm install
pnpm --dir apps/desktop dev
pnpm --dir apps/native dev
```

Gates do desktop:

```bash
pnpm --dir apps/desktop typecheck
pnpm --dir apps/desktop lint
pnpm --dir apps/desktop test
pnpm --dir apps/desktop build
```

Gates adicionais do monorepo/mobile:

```bash
pnpm typecheck
pnpm --dir apps/native test
```

O desktop renderer usa `http://127.0.0.1:5555`; o mobile deve usar o IP LAN exibido em `GET /network/addresses` ou no QR. Em Android/iOS, HTTP claro precisa permanecer permitido conforme a configuração atual do Expo.

## Fluxo de uso

1. Iniciar o desktop e importar JSON `checkin-sync` ou CSV legado.
2. Exibir QR/token no desktop; parear o mobile informando alias do operador.
3. Selecionar evento, buscar por nome/CPF/data/ticket/QR ou escanear QR.
4. Confirmar retirada. Online, o comando chega por WS/HTTP; offline, fica na outbox e é reenviado com o mesmo ID.
5. Acompanhar status, conflitos, locks e auditoria. O desktop continua sendo a decisão final.

## Endpoints principais

`GET /health`, `GET /network/addresses`, `GET /pair/info`, `POST /pair`, `POST /pair/renew`, `GET/POST /events`, participantes e busca por evento, `POST /sync/import`, `POST /admin/import/legacy-csv`, `POST /takeout/confirm`, `POST /takeout/undo`, variantes `/legacy`, `GET /audit`, `/locks`, `GET /sync/events` e WebSocket `/ws`.

## Regras de manutenção

- Preservar `request_id` em retry; não gerar outro após timeout.
- Não tratar `pending` como confirmado e não apagar outbox conflitante/falha automaticamente.
- Check-in, auditoria e evento devem permanecer atômicos; broadcast somente após commit.
- Locks duram 30 s e reduzem disputa, mas a unicidade vem do SQLite.
- Preservar WAL, índices, transações mobile serializadas, cursores e escopo `eventId + sourceType + entityId`.
- Não logar tokens, CPF ou payloads completos.
- Para mudanças, seguir `AGENTS.md`, `.cursor/rules/takeout-offline.mdc` e `.cursor/rules/testing-regression.mdc`.
