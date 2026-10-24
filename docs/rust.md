# Backend Rust — legado

> O backend Rust/Axum em `apps/web/src-tauri` não é o backend do desktop atual. Este arquivo só orienta manutenção de legado solicitada explicitamente.

O fluxo vigente usa `apps/desktop/src/main/server.ts` (Express + `ws`) e SQLite no processo Electron. Não criar novos handlers Rust para funcionalidades do takeout atual.

Para manutenção do sistema vigente, use `AGENTS.md`, `docs/system-current-state.md` e os testes de `apps/desktop`.

