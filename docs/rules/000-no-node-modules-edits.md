# Rule 000: No `node_modules` Edits

## Política

É proibido editar arquivos dentro de `node_modules` diretamente.

## Alternativas permitidas

1. `pnpm patch` / `patchedDependencies`.
2. `overrides`/`resolutions` com justificativa.
3. Fix upstream quando possível.

## Validação

1. Mudança deve aparecer em `patches/` e lockfile, nunca como alteração local em `node_modules`.
