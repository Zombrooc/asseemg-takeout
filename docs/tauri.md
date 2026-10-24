# Tauri — legado

> Este documento é histórico. O desktop atual é Electron em `apps/desktop`. Não usar estes comandos para tarefas novas.

`apps/web/src-tauri` contém a implementação Tauri/Rust anterior do produto. Ela permanece apenas para referência e manutenção explícita de legado.

Para o fluxo atual, consulte:
- `docs/system-current-state.md`
- `AGENTS.md`
- `docs/runbook.md`

Gates atuais:

```bash
pnpm --dir apps/desktop typecheck
pnpm --dir apps/desktop lint
pnpm --dir apps/desktop test
pnpm --dir apps/desktop build
```

