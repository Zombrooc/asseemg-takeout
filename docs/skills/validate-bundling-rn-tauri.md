# Skill: Como validar bundling RN e Tauri (local e CI)

## Objetivo

Validar que o app React Native e o desktop Tauri fazem bundle sem erros de resolução (ex.: "Unable to resolve").

## Passos (React Native / Expo)

1. **Dev**
   - Na raiz: `pnpm dev` ou `pnpm --filter native dev`.
   - Aguardar Metro subir; verificar que não aparece "Unable to resolve" no terminal.
   - Opcional: rodar no emulador Android/iOS.

2. **Export (bundle estático)**
   - `pnpm --filter native run export:android` (ou export:ios).
   - Sucesso: exit code 0 e saída em `apps/native/dist/` (ou conforme config).
   - Falha típica: "Unable to resolve X" → ver [diagnose-metro-resolver.md](diagnose-metro-resolver.md).

3. **Harness no CI**
   - `node scripts/test-harness/run-bundle-check.mjs` executa `expo export --platform android` com timeout e falha se "Unable to resolve" aparecer na saída.
   - Cross-platform: script em Node (spawn), sem bash-only.

## Passos (Tauri)

1. **Build do frontend**
   - O Tauri consome o output do Vite em `apps/web/dist` (ou `../dist` relativo a src-tauri).
   - `pnpm --filter web run build` deve concluir sem erro.

2. **Tauri build**
   - Dentro de apps/web: `pnpm run build` (ou comando configurado para tauri build).
   - Verificar que não há erro de asset ou path.

## O que observar

- Logs do Metro: nenhuma linha "Unable to resolve".
- Exit code 0 em export e build.

## Como agir se falhar

- Ver [diagnose-metro-resolver.md](diagnose-metro-resolver.md).
- Confirmar que metro.config.js não bloqueia paths em node_modules (blockList).
- Confirmar deps em apps/native/package.json (ex.: react-native-is-edge-to-edge) e patch do metro-runtime.

## Checklist final

- [ ] `pnpm --filter native run test` passa (inclui invariantes/contrato).
- [ ] `pnpm --filter native run export:android` (ou run-bundle-check.mjs) conclui sem "Unable to resolve".
- [ ] `pnpm --filter web run build` conclui (Tauri/frontend).
