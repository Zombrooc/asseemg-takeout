# Skill: Como diagnosticar Metro resolver / cache / export maps

## Objetivo

Identificar causa de "Unable to resolve" ou falhas de resolução no Metro (Expo) em monorepo pnpm.

## Sintomas comuns

- "Unable to resolve X" onde X é um módulo que existe em node_modules.
- "Unable to resolve X/dist/..." (path com dist).
- Pacote com "invalid package.json configuration" e "exports ... however this file does not exist".

## Passos

1. **blockList (metro.config.js)**
   - Abra `apps/native/metro.config.js`.
   - Verifique `resolver.blockList`: nenhuma regex deve casar com paths como `node_modules/abort-controller/dist/abort-controller` ou com o request `abort-controller/dist/abort-controller`.
   - Regra: não bloquear `/[\\/]dist[\\/]/` sozinho; bloqueia node_modules. Ver [incident doc](../incidents/2025-02-23-metro-blocklist-dist-resolution.md).

2. **Dependência direta no app**
   - Em pnpm, dependências transitivas (ex.: usadas por expo-router) podem não ser resolvidas no contexto do app. Solução: adicionar como dependência direta em apps/native/package.json (ex.: react-native-is-edge-to-edge).

3. **Patch do metro-runtime**
   - Se o erro for "whatwg-fetch", o patch em `patches/@expo__metro-runtime@6.1.2.patch` remove esse import. Verificar que `pnpm-workspace.yaml` tem `patchedDependencies` e que o patch existe. Rodar `pnpm install` após alterar.

4. **Cache**
   - `expo start --clear` ou limpar .turbo e node_modules e reinstalar.
   - `pnpm store prune` em caso de store corrompida.

5. **Export maps**
   - Warnings "exports ... however this file does not exist" indicam pacote com main/exports apontando para arquivo inexistente (ex.: dist/index.js). Pode ser ignore-scripts na instalação ou pacote quebrado. Verificar .npmrc (ignore-scripts=false) e reinstalação limpa.

## Saídas esperadas

- blockList sem regex que bloqueie paths em node_modules.
- Deps críticas (react-native-is-edge-to-edge) em apps/native/package.json.
- Patch aplicado e patches/ presente.

## Como agir se falhar

- Adicionar teste de invariante/contrato que reproduza o cenário (path ou dep) e corrigir config/dep até o teste passar.
- Documentar em docs/incidents se for novo bug de resolução.
