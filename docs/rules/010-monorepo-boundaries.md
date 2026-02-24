# Rule 010: Monorepo Boundaries

## Política

1. Apps não importam arquivos internos de outros apps.
2. Compartilhamento obrigatório via `packages/*`.
3. Evitar imports relativos longos (`../../..`) quando houver alias/pacote.
4. `apps/server` permanece stub e não recebe lógica do takeout.

## Validação

1. Revisão de PR deve rejeitar violações de boundary.
2. Mudança arquitetural relevante requer ADR.
