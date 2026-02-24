# ASSEEMG Retira (Takeout Offline)

Sistema de retirada de kits em eventos de corrida, com operacao prioritariamente offline em LAN.

- Desktop e a fonte de verdade (SQLite + API HTTP no mesmo processo Tauri).
- Mobile pareia com o desktop (QR/token) e usa a mesma API.

## Funcionalidades atuais

### Desktop (`apps/web`)
- Dashboard com status do servidor, pareamento e lista de eventos importados.
- Importacao de JSON no formato `checkin-sync` (via `/sync/import`).
- Auditoria de confirmacoes (`CONFIRMED`, `DUPLICATE`, `FAILED`).
- Detalhe de evento com lista de participantes e confirmacao manual de check-in.
- Acoes por evento: arquivar, desarquivar, apagar, desfazer check-ins.
- Atualizacao em tempo real por WebSocket para alteracoes de participantes/eventos.

### Backend Takeout em Rust (`apps/web/src-tauri`)
- API Axum em `0.0.0.0:5555` no mesmo processo do app desktop.
- Persistencia em SQLite (`takeout.db` no `app_data_dir` do Tauri).
- Pareamento por token com emissao de `access_token`.
- Confirmacao de check-in com idempotencia por `request_id`.
- Locks por participante para reduzir conflito entre dispositivos.
- Sync pull/push/import para integracao com plataforma externa (`thevent`).

### Mobile (`apps/native`)
- Pareamento por QR code ou URL + token manual.
- Lista de eventos e participantes por evento.
- Busca local (nome, CPF, data, ticket, QR).
- Scanner de QR de ingresso para selecao rapida.
- Confirmacao de check-in com modal de validacao.
- Fila offline local (AsyncStorage) com reprocessamento automatico quando reconecta.
- Atualizacoes em tempo real (WebSocket) para check-ins, locks e lista de eventos.

## Arquitetura

- Nao ha Express/tRPC no fluxo takeout.
- A API principal esta em Rust: `apps/web/src-tauri/src/api`.
- Camadas do backend: `handlers -> services -> repository -> SQLite`.
- `apps/server` e apenas stub tecnico para o monorepo.

### Estrutura principal

```text
apps/
  web/           Frontend desktop (React + Vite + TanStack Router)
                 + Tauri + backend Rust (Axum/rusqlite)
  native/        App mobile (Expo/React Native)
  server/        Stub (nao hospeda a API takeout)
packages/
  env/           Schemas de variaveis de ambiente
  config/        Config TS compartilhada
  api/           Contratos legados (placeholder)
  db/            Prisma/libsql (uso opcional, fora do core do takeout)
```

## Padroes de codigo e qualidade

- Monorepo com `pnpm workspace` + `turborepo`.
- TypeScript em modo `strict` (web/native/packages).
- Alias `@/*` para imports locais em web e native.
- Lint/format com Biome (`pnpm run check`).
- Regras de dominio em `.cursor/rules/`:
  - `takeout-offline.mdc`
  - `testing-regression.mdc`
- Convencao de testes:
  - Bug fix com teste de regressao.
  - Feature nova com teste de unidade e/ou integracao.

## Requisitos

- Node.js 22+ (fixado em `.nvmrc`)
- pnpm 10+
- Rust toolchain (para Tauri desktop)
- Android Studio / Xcode (se for rodar build nativo mobile)

## How To Run (raiz)

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

## Como rodar localmente

1. Instale dependencias:

```bash
pnpm install
```

2. Suba o desktop completo (UI + API Rust):

```bash
cd apps/web
pnpm run desktop:dev
```

Observacoes:
- O frontend abre em `http://localhost:3001` (Vite).
- A API sobe em `http://0.0.0.0:5555`.
- O script `apps/web/scripts/dev-with-wait.mjs` garante que o Vite esteja pronto antes da janela Tauri abrir.

3. Em paralelo, rode o mobile:

```bash
pnpm run dev:native
```

4. No mobile:
- Abra `Pair`.
- Escaneie o QR exibido no desktop (ou informe URL + token).
- Apos parear, selecione evento, abra participante e confirme check-in.

## Variaveis de ambiente

### Mobile
- Arquivo de exemplo: `apps/native/.env.example`
- Chave:
  - `EXPO_PUBLIC_SERVER_URL` (default: `http://127.0.0.1:5555`)

### Web
- Cliente web pode usar `VITE_TAKEOUT_API_URL` (fallback para `http://127.0.0.1:5555`).

## Endpoints principais da API

- `GET /health`
- `GET /network/addresses`
- `GET /pair/info`
- `POST /pair/renew`
- `POST /pair`
- `GET /events`
- `GET /events/:event_id/participants`
- `GET /events/:event_id/participants/search?q=<texto>&mode=<modo>`
- `POST /events/:event_id/checkins/reset`
- `POST /events/:event_id/archive`
- `POST /events/:event_id/unarchive`
- `DELETE /events/:event_id`
- `POST /takeout/confirm`
- `GET /audit`
- `POST /locks`
- `POST /locks/renew`
- `GET /locks/:participant_id`
- `DELETE /locks/:participant_id`
- `GET /sync/pull`
- `GET /sync/events`
- `POST /sync/import`
- `POST /sync/push`

### Exemplos de busca por evento

- Buscar por nome (parcial, sem diferenciar acento/caixa):
  - `GET /events/ev-123/participants/search?q=joao&mode=nome`
- Buscar por CPF (exato):
  - `GET /events/ev-123/participants/search?q=12345678900&mode=cpf`
- Buscar por QR code (exato):
  - `GET /events/ev-123/participants/search?q=QR-ABC-123&mode=qr`
- Buscar por ticket id (exato):
  - `GET /events/ev-123/participants/search?q=seat-001&mode=ticket_id`
- Buscar por data de nascimento (exato):
  - `GET /events/ev-123/participants/search?q=1990-01-01&mode=birth_date`

## Scripts uteis

### Raiz
- `pnpm run dev`
- `pnpm run dev:web`
- `pnpm run dev:native`
- `pnpm run dev:server`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run check-types`
- `pnpm run check`
- `pnpm run db:push`
- `pnpm run db:generate`
- `pnpm run db:migrate`
- `pnpm run db:studio`
- `pnpm run db:local`

### Desktop (`apps/web`)
- `pnpm run dev`
- `pnpm run desktop:dev`
- `pnpm run desktop:build`
- `pnpm run desktop:icons`

### Mobile (`apps/native`)
- `pnpm run dev`
- `pnpm run android`
- `pnpm run ios`
- `pnpm run test`

## Medicao e validacao de build

- **Manifest:** `pnpm run build:manifest` gera/atualiza `build-manifest.json` na raiz (schema estavel: commit, timestamp, versoes node/pnpm/cargo/rustc, OS, tamanhos de artefatos em `dist/`, resultado de `check-types` e testes mobile). Nao commitar o ficheiro; CI publica como artifact.
- **Baseline:** `pnpm run build:baseline` mede o tempo de `pnpm run build` e em seguida executa `build:manifest`.
- **Scripts em `scripts/`:** `measure-build.mjs`, `collect-artifacts.mjs`, `generate-manifest.mjs`, `constants.mjs`.

## Testes

### Backend Rust (integracao Axum + SQLite em memoria)

```bash
cd apps/web/src-tauri
cargo test
```

### Mobile (Jest)

```bash
cd apps/native
pnpm run test
```
