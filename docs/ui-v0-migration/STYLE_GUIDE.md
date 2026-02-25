# Guia de estilo — Tamagui (apps/native)

## Tokens de cor (V0)

Definidos em `apps/native/tamagui.config.ts`. Uso em temas `light` e `dark`:

| Token     | Uso semântico        |
|----------|----------------------|
| background | Fundo da tela       |
| foreground | Texto principal     |
| muted     | Texto secundário/terciário |
| card      | Fundo de cards       |
| border    | Bordas e divisores    |
| accent    | Ações primárias, links |
| success   | Conectado, confirmado |
| warning   | Aguardando, aviso    |
| danger    | Erro, offline        |
| info      | Informação           |
| overlay   | Overlay de modais    |

Cores de texto: `textPrimary`, `textSecondary`, `textTertiary` (mapeados no tema).

## Onde usar Tamagui vs RN

- **Tamagui**: Button, Card, Input, Badge, Banner, Spinner, EmptyState, TopBar, ScreenContainer, Separator. Dentro do modal: Text, XStack, YStack quando os tipos aceitarem as props.
- **React Native (View, Text, Pressable)**: Layout e texto quando precisar de `style` com margin/padding/flex sem erros de tipo (Tamagui 1.x restringe várias props). Preferir valores em número (8, 12, 16) ou hex para cores.

## Constantes

- `components/mobile-tamagui/constants.ts`: `PAIRING_METHODS`, `STATUS_PILL_LABELS`, tipo `PairingMethod`. Use para evitar duplicação e em testes.

## Shorthands (tamagui.config)

Disponíveis: `p`, `px`, `py`, `pt`, `pb`, `m`, `mx`, `my`, `mt`, `mb`, `bg`, `br`, `ai`, `jc`. Em componentes que usam apenas View/Text do RN, use `style={{ marginBottom: 8 }}` etc.

## Acessibilidade

- Manter `testID` em botões e ações críticas (ex.: `connection-status-retry`, `pair-submit-button`, `participant-confirm-*`).
- `accessibilityLabel` onde fizer sentido (ex.: "Limpar busca" no SearchBar).
