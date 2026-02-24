# apps/web

Frontend desktop (React/Vite) e entrypoint Tauri para executar backend Rust local.

## Scripts

```bash
pnpm run dev
pnpm run desktop:dev
pnpm run desktop:build
pnpm run typecheck
```

## Observações

1. API principal vive em `src-tauri` (Axum + SQLite), não em `apps/server`.
