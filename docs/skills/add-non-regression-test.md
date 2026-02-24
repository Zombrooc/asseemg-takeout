# Skill: Como adicionar teste de não-regressão para bugfix

## Objetivo

Garantir que todo bug corrigido tenha um teste que falhe se o bug reaparecer.

## Passos

1. **Onde colocar**
   - Lógica isolada: teste unitário ao lado do código ou em `__tests__/` do pacote/app.
   - Config/resolução: use `__tests__/config/` (invariantes) ou `__tests__/regression/` (contrato) em apps/native. Ex.: [apps/native/__tests__/config/metro-blocklist.invariants.test.ts](../../apps/native/__tests__/config/metro-blocklist.invariants.test.ts), [apps/native/__tests__/regression/metro-resolution.contract.test.ts](../../apps/native/__tests__/regression/metro-resolution.contract.test.ts).

2. **Padrão**
   - `describe` / `it`; arrange–act–assert.
   - Nome do describe/it deve indicar a invariante ou contrato (ex.: "blockList must not block node_modules/.../dist/...").

3. **O que testar**
   - Invariantes: propriedades que devem ser sempre verdadeiras (ex.: blockList não contém regex que case com path X).
   - Contrato: existência de config/arquivo/dep (ex.: package.json contém dep Y; patch Z existe).

4. **Rodar local**
   - `pnpm --filter native run test` (para apps/native).
   - Ou `pnpm run test` dentro do app.

5. **CI**
   - Os testes rodam no workflow de build/measure. Garanta que o novo teste está coberto pelo `testMatch` do Jest (ex.: `**/__tests__/**/*.test.(ts|tsx|js|jsx)`).

## O que observar

- Teste deve **falhar** com o bug presente e **passar** após o fix.
- Evite snapshots de config se forem ruidosos; prefira asserções sobre invariantes.

## Checklist final

- [ ] Teste criado em __tests__/ (config ou regression conforme o caso).
- [ ] Teste falha quando o bug está presente (validado mentalmente ou revertendo o fix).
- [ ] Teste passa após o fix.
- [ ] `pnpm --filter native run test` (ou equivalente) passa localmente.
