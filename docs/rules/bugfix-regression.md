# Rule: Bugfix regression

## Objetivo

Garantir que toda correcao de bug seja documentada e protegida por teste de nao-regressao, evitando que o mesmo problema volte.

## Motivacao

Bugs complexos (bundling, resolucao de modulos, config) reaparecem se nao houver documentacao e testes que falhem ao reintroduzir a causa. Ver:

- [docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md](../incidents/2025-02-23-metro-blocklist-dist-resolution.md)
- [docs/incidents/2026-02-24-tauri-blank-ui-after-build.md](../incidents/2026-02-24-tauri-blank-ui-after-build.md)

## Como aplicar

- Ao corrigir um bug:
  1. Criar documento em `docs/incidents/<YYYY-MM-DD>-<slug>.md` com resumo, sintomas, causa raiz, correcao, sinais precoces e prevencoes.
  2. Adicionar teste(s) de nao-regressao (unit e/ou integracao) que falhem se o bug reaparecer.
  3. Opcional: vincular o commit que introduz o fix no incident doc.

## Como o CI valida

- O script `scripts/verify-change-policy.mjs` e executado no CI. Se houver alteracao em arquivos sensiveis (ex.: metro.config, package.json do native, pnpm-workspace, tauri.conf), o diff deve incluir ao menos um arquivo em `docs/incidents/**`, `**/__tests__/**`, `**/regression/**` ou `scripts/test-harness/**`.
- Os testes de invariantes e contrato (ex.: `apps/native/__tests__/config/*`, `apps/native/__tests__/regression/*`) rodam em todo PR.

## Excecoes

- Correcoes triviais (typo, comentario) podem nao exigir incident doc; nesse caso, no PR explicitar "N/A" no template e justificar.
- Excecoes formais: aprovacao do mantenedor e registro breve no incident doc ou em comentario do PR.
