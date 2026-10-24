# Skill: Debug Tauri Build — legado

> O desktop atual é Electron em `apps/desktop`. Use este documento somente para manutenção explícita de `apps/web/src-tauri`; para o fluxo atual, siga `docs/runbook.md` e `docs/system-current-state.md`.

## Passos

1. Confirmar toolchain:
   - `cargo --version`
   - `pnpm --filter web run tauri -- --version`
2. Rodar testes Rust:
   - `cargo test --manifest-path apps/web/src-tauri/Cargo.toml`
3. Build desktop:
   - `pnpm --filter web run desktop:build`
4. Validar dependências de sistema (Linux) quando houver erro de linking.
