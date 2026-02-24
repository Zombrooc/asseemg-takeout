# Rule 050: CI Quality Gates

## Política

Todo PR deve passar:

1. `pnpm run lint`
2. `pnpm run typecheck`
3. `pnpm run test`
4. `pnpm run build`

Além disso:

1. `verify-change-policy` para arquivos sensíveis.
2. `metro bundle check`.
3. Jobs split strict Linux/Windows.
