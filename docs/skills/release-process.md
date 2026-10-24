# Processo de release

## Fonte atual

O artefato desktop é Electron em `apps/desktop`; o pacote é gerado pelo `electron-builder`. Tauri/ `apps/web` é legado e não faz parte do release atual, salvo solicitação explícita.

## Pré-release

1. Instalar com lockfile.
2. Rodar gates locais.
3. Validar fluxo pareamento → importação → busca → check-in → realtime/offline → auditoria.
4. Conferir que não há token, CPF ou payload completo em logs/artefatos.
5. Atualizar documentação se contrato, migração ou operação mudou.

```bash
pnpm install --frozen-lockfile
pnpm --dir apps/desktop typecheck
pnpm --dir apps/desktop lint
pnpm --dir apps/desktop test
pnpm --dir apps/desktop build
pnpm --dir apps/desktop dist
```

Para mudanças mobile, acrescentar `pnpm --dir apps/native test`. Para contratos compartilhados, acrescentar `pnpm typecheck`.

