# Incident: Metro bundling failure — blockList blocking node_modules paths

## Resumo executivo

- **O que ocorreu:** O bundle Android do app React Native (Expo/Metro) falhava com "Unable to resolve" para módulos que expõem entry em `dist/` (ex.: `abort-controller/dist/abort-controller`, `whatwg-fetch`, `react-native-is-edge-to-edge`). Impacto: impossível rodar `pnpm dev` ou build/export do app native.
- **Quando:** Após introdução de `resolver.blockList` em `apps/native/metro.config.js` com regex `/[\\/]dist[\\/]/` para excluir pastas de build do monorepo.
- **Quem percebeu:** Desenvolvimento local ao rodar Metro/Expo.

## Sintomas observáveis

- **Logs/mensagens:**
  - `Unable to resolve "abort-controller/dist/abort-controller" from ".../react-native/Libraries/Core/setUpXHR.js"`
  - `Unable to resolve "whatwg-fetch" from ".../@expo/metro-runtime/src/location/install.native.ts"`
  - `Unable to resolve "react-native-is-edge-to-edge" from ".../expo-router/build/utils/statusbar.js"`
- **Ambientes afetados:** pnpm monorepo, Metro bundler, Expo SDK 54, app em `apps/native`. Android bundling (e dev) falhando.

## Causa raiz

1. **Principal:** Metro `resolver.blockList` incluía `/[\\/]dist[\\/]/`, que bloqueia qualquer caminho contendo o substring `dist`. O blockList é aplicado a requests/resolved paths; requests como `abort-controller/dist/abort-controller` (usado pelo react-native) não contêm `node_modules` no texto do request, então eram bloqueados → Metro recusava o módulo.
2. **Secundária (whatwg-fetch):** `@expo/metro-runtime` importa `whatwg-fetch` em `install.native.ts`; em pnpm a resolução desse pacote falhava (layout de node_modules). React Native já fornece `fetch` global, então o import é redundante.
3. **Secundária (react-native-is-edge-to-edge):** `expo-router` depende de `react-native-is-edge-to-edge`; no pnpm essa dependência não era resolvida no contexto do app (não estava como dependência direta de `apps/native`).

## Como a correção resolve

- **blockList:** Removida qualquer entrada que bloqueie `dist` de forma ampla. Mantidos apenas: `apps/web/src-tauri/target`, `.turbo`, `.git`. Assim, paths como `node_modules/abort-controller/dist/abort-controller` deixam de ser bloqueados.
- **whatwg-fetch:** Patch em `patches/@expo__metro-runtime@6.1.2.patch` remove o `import 'whatwg-fetch'` de `install.native.ts` (RN já fornece fetch).
- **react-native-is-edge-to-edge:** Adicionada como dependência direta em `apps/native/package.json` (`~1.2.1`).

Arquivos envolvidos: `apps/native/metro.config.js`, `pnpm-workspace.yaml` (patchedDependencies), `apps/native/package.json`, e o patch em `patches/@expo__metro-runtime@6.1.2.patch`.

## Sinais precoces

- Qualquer mensagem "Unable to resolve" para um módulo cujo path ou request contenha `dist/` (ex.: `*\/dist\/*`).
- "Unable to resolve whatwg-fetch" ou "Unable to resolve react-native-is-edge-to-edge" ao rodar Metro/Expo.
- Adicionar ou alterar `resolver.blockList` em metro.config sem validar que paths em `node_modules/.../dist/` não são bloqueados.

## Prevenções adicionadas

- **Testes:** Invariantes em `apps/native/__tests__/config/metro-blocklist.invariants.test.ts` e `native-deps.invariants.test.ts`; contrato em `apps/native/__tests__/regression/metro-resolution.contract.test.ts`.
- **Harness:** `scripts/test-harness/metro-bundle-check.mjs` / `run-bundle-check.mjs` para validar que `expo export` não produz "Unable to resolve".
- **Rules:** docs/rules/bugfix-regression.md, metro-expo-config.md, expo-deps.md.
- **Policy:** scripts/verify-change-policy.mjs exige doc ou testes quando arquivos sensíveis (metro.config, package.json native, pnpm-workspace, etc.) são alterados.
- **CI:** Job de build/measure inclui testes de invariantes/contrato e bundle check; verify-change-policy no PR.

## Checklist para futuros fixes/features

- [ ] Para **bugfix:** criar doc em `docs/incidents/<YYYY-MM-DD>-<slug>.md` com resumo, sintomas, causa raiz, correção, prevenções.
- [ ] Adicionar **teste de não-regressão** (unit e/ou integration) que falhe se o bug reaparecer.
- [ ] Vincular **commit** que introduz o fix no incident doc (opcional mas recomendado).
- [ ] Para alterações em **metro.config.js**, **babel**, **tsconfig** (native), **app.json**, **tauri.conf**, **package.json** (native/raiz), **pnpm-workspace.yaml**: garantir que existe doc em docs/incidents ou ficheiros em `__tests__`/`regression`/`scripts/test-harness` no mesmo PR.
