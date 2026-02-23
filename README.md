# Takeout Offline

Sistema de retirada de kit em eventos de corrida, 100% offline na LAN. Desktop = fonte de verdade (SQLite + API HTTP na porta 5555); mobile pareia via QR e consome a mesma API.

## Stack

- **TypeScript**, **React**, **TanStack Router**, **Vite**, **Tailwind**
- **Tauri** + **Axum** + **rusqlite**: app desktop com API HTTP no mesmo processo (porta 5555)
- **React Native / Expo**: app mobile na LAN
- **Turborepo**, **Biome**

A API takeout não usa Express nem tRPC; está em Rust em `apps/web/src-tauri`.

## Estrutura

```
├── apps/
│   ├── web/         # Frontend (Vite + TanStack Router) + Tauri + API Axum (5555)
│   ├── native/      # Mobile (Expo), consome API do desktop na LAN
│   └── server/      # Stub (API takeout está no Tauri)
├── packages/
│   ├── api/         # Contratos vazios/legado
│   ├── config/      # Configuração compartilhada
│   ├── db/          # Prisma (schema; uso opcional)
│   └── env/         # Variáveis de ambiente
```

## Getting Started

```bash
pnpm install
```

**Desktop + API takeout**: frontend e API sobem juntos com Tauri:

```bash
pnpm run dev:web
# Em outro terminal:
cd apps/web && pnpm run desktop:dev
```

- Frontend: [http://localhost:3001](http://localhost:3001)
- API: `http://0.0.0.0:5555`

**Mobile**: na mesma LAN, use Expo e pareie com o desktop (QR ou IP:5555):

```bash
pnpm run dev:native
```

## Scripts (raiz)

- `pnpm run dev`: Turbo dev para todos os apps
- `pnpm run dev:web`: Só o frontend web (Vite)
- `pnpm run dev:native`: Expo / mobile
- `pnpm run dev:server`: Stub (mensagem “API is in Tauri”)
- `pnpm run build`: Build de todos os apps
- `pnpm run check-types`: Verificação de tipos
- `pnpm run check`: Biome (format + lint)
- `pnpm run db:push`, `db:generate`, `db:migrate`, `db:studio`, `db:local`: Prisma no package `@pickup/db` (quando usado)

## Scripts (apps/web)

- `pnpm run desktop:dev`: Tauri em desenvolvimento (inclui API em 5555)
- `pnpm run desktop:build`: Build do app desktop

## Takeout

Desktop é a fonte de verdade: SQLite (rusqlite) + API HTTP em 0.0.0.0:5555. Mobile descobre o desktop na LAN, lê o QR (URL + pairing_token), faz POST `/pair` e usa `Authorization: Bearer <access_token>` nas requisições. Contratos e client da API em `apps/web/src/lib/takeout-api.ts`.

## Formatação e lint

- `pnpm run check`: Biome check e fix
