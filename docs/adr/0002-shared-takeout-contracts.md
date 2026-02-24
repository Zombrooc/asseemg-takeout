# ADR-0002: Unificar contratos takeout em pacote compartilhado

- Status: Accepted
- Data: 2026-02-24
- Donos: Plataforma + Mobile + Desktop

## Contexto

Havia duplicação de tipos entre web e native, com risco de drift.

## Decisão

1. Definir contratos em `packages/api/src/takeout-contracts.ts`.
2. Consumir os mesmos tipos em web/native.
3. Manter aliases de compatibilidade durante transição.

## Consequências

- Fonte única de verdade para API e mensagens WS.
- Menor chance de divergência de payload.

## Plano de validação

1. `pnpm turbo run typecheck`.
2. Testes unitários native passando.
