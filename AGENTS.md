# Contexto para o agente

## Desktop scope gates

- The current desktop app is `apps/desktop` (Electron). Desktop UI, export, and operation features must be implemented only inside that directory.
- Treat `apps/web` and `apps/web/src-tauri` as legacy/reference code for this flow. Do not modify them for desktop tasks unless the user explicitly requests it.
- Before editing a desktop task, verify that every target path is inside `apps/desktop`. If a proposed solution points to `apps/web`, `apps/web/src`, or `apps/web/src-tauri`, stop and reassess the scope.
- Run tests and validation for desktop features using the scripts in `apps/desktop`; do not automatically port components, routes, or utilities from the Tauri implementation.
- Modify `apps/native` or shared contracts only when explicitly required by the requested task.

Projeto **takeout offline**: sistema de retirada de kit em eventos de corrida, 100% offline na LAN. Desktop = fonte de verdade (SQLite + API HTTP); mobile = cliente que pareia e consome a mesma API.

## Onde está o quê

- **Backend takeout**: `apps/web/src-tauri` (Rust: Axum + rusqlite, porta 5555, mesmo processo que o app Tauri).
- **Frontend desktop**: `apps/web/src` (Vite, TanStack Router, React).
- **Mobile**: `apps/native` (Expo/React Native), consome API do desktop na LAN.
- **Contratos/types da API**: `apps/web/src/lib/takeout-api.ts` (types e client HTTP).
- **Regras do projeto**: `.cursor/rules/` (takeout-offline, testing-regression).
- **Skill de domínio**: `.cursor/skills/takeout-offline/`.

Para implementação takeout e testes, seguir `.cursor/rules` (takeout-offline, testing-regression) e a skill takeout-offline quando aplicável.
