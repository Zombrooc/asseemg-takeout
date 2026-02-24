# Relatório final: Prevenção de regressão Metro bundling

## Arquivos criados

| Caminho | Descrição |
|--------|-----------|
| docs/incidents/2025-02-23-metro-blocklist-dist-resolution.md | Incident doc (resumo, causa raiz, prevenções) |
| docs/rules/bugfix-regression.md | Rule: bugfix com doc + teste não-regressão |
| docs/rules/metro-expo-config.md | Rule: alterações Metro/Expo/Tauri com teste |
| docs/rules/expo-deps.md | Rule: deps Expo alinhadas e explícitas |
| docs/skills/add-non-regression-test.md | Skill: como adicionar teste não-regressão |
| docs/skills/validate-bundling-rn-tauri.md | Skill: validar bundling RN e Tauri |
| docs/skills/update-expo-deps.md | Skill: atualizar deps Expo com segurança |
| docs/skills/diagnose-metro-resolver.md | Skill: diagnosticar Metro resolver/cache |
| docs/verification/metro-bundling-smoke.md | Cenários de verificação e smoke |
| apps/native/__tests__/config/metro-blocklist.invariants.test.ts | Invariantes do blockList Metro |
| apps/native/__tests__/config/native-deps.invariants.test.ts | Invariantes deps native (react-native-is-edge-to-edge, patch) |
| apps/native/__tests__/regression/metro-resolution.contract.test.ts | Contrato: blockList, deps, patch |
| scripts/test-harness/metro-bundle-check.mjs | Harness: expo export e validação "Unable to resolve" |
| scripts/test-harness/run-bundle-check.mjs | Entry point do harness para CI |
| scripts/verify-change-policy.mjs | Policy: arquivos sensíveis exigem doc/teste no diff |
| .github/PULL_REQUEST_TEMPLATE.md | Template PR com checklist obrigatório |

## Arquivos alterados

| Caminho | Alteração |
|--------|-----------|
| .github/workflows/build-and-measure.yml | Steps "Verify change policy" e "Metro bundle check" (timeout 5 min) |

## Rationale

- **Testes:** Garantem que blockList não volte a bloquear paths em node_modules com `dist/`, que `react-native-is-edge-to-edge` permaneça em apps/native e que o patch do metro-runtime exista.
- **Policy script:** Força documentação ou testes quando metro.config, package.json (native), pnpm-workspace, etc. são alterados.
- **Docs:** Permitem reproduzir o bug, diagnosticar e prevenir (rules + skills).

## Como rodar localmente

```bash
# Testes (inclui invariantes e contract)
pnpm --filter native run test

# Apenas testes anti-regressão
pnpm --filter native run test -- --testPathPattern="invariants|contract|config|regression"

# Policy (simular diff: alteração só em metro.config deve falhar)
echo "apps/native/metro.config.js" | node scripts/verify-change-policy.mjs   # exit 1
echo "apps/native/__tests__/config/foo.test.ts" | node scripts/verify-change-policy.mjs  # exit 0 com metro no diff

# Bundle check (expo export; ~2 min)
node scripts/test-harness/run-bundle-check.mjs
```

## Como o CI bloqueia regressões

1. **Test native:** Falha se algum teste (incl. invariantes e contract) falhar.
2. **Verify change policy:** Falha se o diff contiver arquivo sensível sem doc/test/harness no mesmo diff.
3. **Metro bundle check:** Falha se `expo export --platform android` imprimir "Unable to resolve" ou sair com código não zero.
