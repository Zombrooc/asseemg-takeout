# Rule: Bugfix regression

## Objetivo

Garantir que toda correção de bug seja documentada e protegida por teste de não-regressão, evitando que o mesmo problema volte (ex.: incident Metro blockList/dist resolution).

## Motivação

Bugs complexos (bundling, resolução de módulos, config) reaparecem se não houver documentação e testes que falhem ao reintroduzir a causa. Ver [docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md](../incidents/2025-02-23-metro-blocklist-dist-resolution.md).

## Como aplicar

- Ao corrigir um bug:
  1. Criar documento em `docs/incidents/<YYYY-MM-DD>-<slug>.md` com resumo, sintomas, causa raiz, correção, sinais precoces e prevenções.
  2. Adicionar teste(s) de não-regressão (unit e/ou integração) que falhem se o bug reaparecer.
  3. Opcional: vincular o commit que introduz o fix no incident doc.

## Como o CI valida

- O script `scripts/verify-change-policy.mjs` é executado no CI. Se houver alteração em arquivos sensíveis (ex.: metro.config, package.json do native, pnpm-workspace), o diff deve incluir ao menos um arquivo em `docs/incidents/**`, `**/__tests__/**`, `**/regression/**` ou `scripts/test-harness/**`.
- Os testes de invariantes e contrato (ex.: `apps/native/__tests__/config/*`, `apps/native/__tests__/regression/*`) rodam em todo PR.

## Exceções

- Correções triviais (typo, comentário) podem não exigir incident doc; nesse caso, no PR explicitar "N/A" no template e justificar.
- Exceções formais: aprovação do mantenedor e registro breve no incident doc ou em comentário do PR.
