# Rule: Metro / Expo / Tauri config changes

## Objetivo

Nenhuma alteração em configurações de bundling/resolução (Metro, Babel, Expo, Tauri) sem teste de integração ou invariante correspondente.

## Motivação

O bug [2025-02-23-metro-blocklist-dist-resolution](../incidents/2025-02-23-metro-blocklist-dist-resolution.md) foi causado por alteração em `metro.config.js` (blockList) sem validação de que paths em `node_modules/.../dist/` continuariam resolvíveis.

## Como aplicar

- Ao alterar:
  - `apps/native/metro.config.js`
  - `apps/native/babel.config.*`
  - `apps/native/tsconfig.json` (ou app.json / app.config.*)
  - `apps/web/src-tauri/tauri.conf.json`
  adicione ou atualize testes que validem o comportamento crítico (ex.: blockList não bloqueia paths de node_modules com `dist/`; resolução de módulos usados pelo Metro).
- Use os testes em `apps/native/__tests__/config/` e `apps/native/__tests__/regression/` como referência.

## Como o CI valida

- `scripts/verify-change-policy.mjs`: alterações nesses arquivos exigem presença de doc em `docs/incidents/**` ou ficheiros em `__tests__`/`regression`/`scripts/test-harness` no mesmo PR.
- Testes unitários de invariantes e contrato rodam em todo PR.

## Exceções

- Ajustes puramente de comentário ou formatação, sem mudança de comportamento: justificar no PR. Alterações que mudem regex, paths ou entries de config devem ter teste.
