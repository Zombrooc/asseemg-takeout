# Skill: Release Process

## Pré-release

1. Rodar quality gates locais.
2. Garantir CI verde.
3. Atualizar docs de run/build se necessário.

## Checklist

1. `pnpm install`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run test`
5. `pnpm run build`
6. Desktop: `pnpm --filter web run desktop:build`
