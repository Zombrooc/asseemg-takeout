# Skill: Como atualizar dependências Expo com segurança

## Objetivo

Atualizar pacotes do app Expo (apps/native) sem quebrar bundling ou compatibilidade com o SDK.

## Passos

1. **Diagnóstico**
   - Em apps/native: `npx expo-doctor`.
   - Anote pacotes "out of date" ou com versão esperada diferente.

2. **Alinhar versões**
   - `npx expo install --fix` (em apps/native) aplica as versões recomendadas pelo SDK.
   - Ou instalar manualmente: `pnpm add <pkg>@<versão-esperada>` no workspace native.

3. **Dependências críticas para Metro**
   - Manter como dependência direta em apps/native: `react-native-is-edge-to-edge` (ex.: ~1.2.1). Não remover mesmo que seja transitiva de expo-router.
   - Após mudar deps, rodar `pnpm --filter native run test` e `pnpm --filter native run export:android` (ou run-bundle-check.mjs) para validar.

4. **Patch do metro-runtime**
   - Se atualizar @expo/metro-runtime, verificar se o patch em `patches/@expo__metro-runtime@6.1.2.patch` ainda se aplica. Se a versão mudar, criar novo patch com `pnpm patch @expo/metro-runtime@<versão>` e atualizar pnpm-workspace.yaml.

## O que observar

- expo-doctor: "X packages out of date"; aplicar --fix.
- Peer dependency warnings: podem ser aceitos temporariamente; não devem impedir build.
- "Unable to resolve" após atualização: ver [diagnose-metro-resolver.md](diagnose-metro-resolver.md).

## Saídas esperadas

- `expo-doctor` com 0 ou poucos avisos críticos.
- `expo export` e testes passando.

## Checklist final

- [ ] expo-doctor e expo install --fix executados.
- [ ] Testes (native) passando.
- [ ] Bundle check (export ou run-bundle-check.mjs) passando.
