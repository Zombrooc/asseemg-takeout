# Skill: Debug Metro no Monorepo

## Checklist rápido

1. Validar `apps/native/metro.config.js`.
2. Confirmar patch em `patches/@expo__metro-runtime@6.1.2.patch`.
3. Rodar:
   - `pnpm --filter native run test`
   - `node scripts/test-harness/run-bundle-check.mjs`
4. Limpar cache: `expo start --clear`.
