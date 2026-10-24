# Verificação de bundling e smoke

Este smoke mantém foco no app native e no desktop Electron atual. Os cenários Tauri/web abaixo do histórico não são gates do fluxo vigente.

## Native

```bash
pnpm --dir apps/native test
```

Para alterações de configuração Expo/Metro, executar também o comando de export/build definido no `package.json` de `apps/native` e verificar ausência de erros de resolução.

## Desktop Electron

```bash
pnpm --dir apps/desktop typecheck
pnpm --dir apps/desktop lint
pnpm --dir apps/desktop test
pnpm --dir apps/desktop build
```

Smoke funcional: iniciar desktop, testar `GET /health`, pairing, importação, busca, check-in, replay WebSocket e auditoria.

## Monorepo

```bash
pnpm typecheck
pnpm run build
```

Não executar comandos `pnpm --filter web` ou `cargo test apps/web/src-tauri` como validação do desktop atual; eles são apenas para tarefas de legado explicitamente solicitadas.

