# React Native (Expo/Metro) no Monorepo

## Objetivo

Manter configuração Metro mínima e estável para Expo + Uniwind + monorepo.

## Regras práticas

1. Não bloquear paths de `node_modules/.../dist/...` no `blockList`.
2. Alterações de Metro/Expo exigem teste de invariantes/contrato.
3. Dependências críticas de resolução devem ficar explícitas em `apps/native/package.json`.

## Comandos úteis

```bash
pnpm --filter native run dev
pnpm --filter native run test
node scripts/test-harness/run-bundle-check.mjs
```

## Troubleshooting rápido

1. Limpar cache: `expo start --clear`.
2. Reinstalar deps: `pnpm install --frozen-lockfile`.
3. Validar patch do metro-runtime em `patches/`.
4. Conferir invariantes: `apps/native/__tests__/config`.
