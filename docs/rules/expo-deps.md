# Rule: Expo dependencies

## Objetivo

Manter dependências do app Expo (apps/native) alinhadas às versões esperadas pelo SDK e declarar explicitamente dependências transitivas críticas para resolução no pnpm.

## Motivação

No incident [2025-02-23-metro-blocklist-dist-resolution](../incidents/2025-02-23-metro-blocklist-dist-resolution.md), `react-native-is-edge-to-edge` (usada por expo-router) não era resolvida no contexto do app; foi necessária como dependência direta. Versões fora do esperado pelo Expo podem causar erros de bundling ou runtime.

## Como aplicar

- Rodar `npx expo-doctor` e `npx expo install --check` (ou `expo install --fix`) em `apps/native` ao atualizar deps ou SDK.
- Manter no `package.json` de apps/native as dependências que o Expo recomenda e as que são usadas diretamente por expo-router/Metro (ex.: `react-native-is-edge-to-edge`).
- Documentar no PR quando uma dep for adicionada por exigência de resolução (pnpm/workspace).

## Como o CI valida

- Testes em `apps/native/__tests__/config/native-deps.invariants.test.ts` verificam presença de `react-native-is-edge-to-edge`.
- Opcional: step advisory com `npx expo-doctor` (não bloqueante por peer deps; falhas devem ser revisadas).

## Exceções

- Peer dependency warnings (ex.: @types/react) podem ser aceitos temporariamente; documentar e tratar em follow-up. Não remover deps obrigatórias para Metro/Expo (ex.: react-native-is-edge-to-edge).
