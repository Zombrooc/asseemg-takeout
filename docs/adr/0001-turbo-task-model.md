# ADR-0001: Padronizar task model do Turborepo

- Status: Accepted
- Data: 2026-02-24
- Donos: Plataforma

## Contexto

`lint` não executava tasks e `test` falhava no turbo por ausência de padronização de scripts/tasks.

## Decisão

1. Adotar tasks canônicas: `lint`, `typecheck`, `test`, `build`, `dev`.
2. Manter `check-types` como alias temporário de `typecheck`.
3. Scripts raiz apenas delegam para `turbo run ...`.

## Consequências

- Gate de qualidade consistente no monorepo.
- Menos ambiguidade de comandos em CI e local.

## Plano de validação

Executar:
- `pnpm turbo run lint`
- `pnpm turbo run typecheck`
- `pnpm turbo run test`
- `pnpm turbo run build`
