# Rule 030: Style System (Mobile)

## Política

1. **Migração em curso**: Stack alvo para UI mobile é **Tamagui** (`apps/native/tamagui.config.ts`). HeroUI Native + Uniwind permanecem em bridge até conclusão da migração.
2. Tokens/tema devem ser centralizados em `tamagui.config.ts` (light/dark) e reutilizados por `components/ui-tamagui` e `components/mobile-tamagui`.
3. Evitar estilos duplicados e divergentes entre telas equivalentes. Em componentes que usam View/Text do RN por restrições de tipo do Tamagui 1.x, usar valores numéricos ou hex consistentes (ver `docs/ui-v0-migration/STYLE_GUIDE.md`).

## Validação

1. Mudanças de estilo base devem atualizar documentação em `docs/react-native.md` e, quando aplicável, `docs/ui-v0-migration/STYLE_GUIDE.md`.
