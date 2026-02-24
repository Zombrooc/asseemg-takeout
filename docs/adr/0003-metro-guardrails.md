# ADR-0003: Guardrails para Metro/Expo no monorepo

- Status: Accepted
- Data: 2026-02-24
- Donos: Mobile

## Contexto

Incidentes de resolução no Metro causaram falhas de bundling em ambiente Expo + pnpm.

## Decisão

1. Manter regras/documentação/testes de invariantes de Metro.
2. Exigir validação de mudanças sensíveis via `verify-change-policy`.
3. Executar smoke de bundling em CI.

## Consequências

- Menor chance de regressão de resolver em releases futuras.

## Plano de validação

1. `pnpm --filter native run test`
2. `node scripts/test-harness/run-bundle-check.mjs`
