# UI v0 Migration Report — Tamagui

## Resumo

Migração estrutural do app mobile (`apps/native`) de HeroUI Native + Uniwind para Tamagui como sistema de UI, mantendo contrato funcional (pairing, home, event, audit, confirm modal, offline queue). HeroUI/Uniwind permanecem no layout durante a transição (bridge mode).

## Entregas

### Fase 1 — Setup Tamagui
- `tamagui.config.ts`: tokens V0 (background, foreground, muted, card, border, accent, success, warning, danger, info, overlay), temas light/dark, shorthands.
- `app/_layout.tsx`: `TamaguiProvider` com config, `defaultTheme="light"`.
- `components/ui-tamagui/`: Button, Card, Input, Separator, Banner, Badge, Spinner, EmptyState, TopBar, ScreenContainer.

### Fase 2 — Componentes mobile-tamagui
- `components/mobile-tamagui/`: equivalentes por área (home, pair, event, audit) + `ParticipantListItem`, `constants.ts`.
- Decisão: Tamagui 1.x tem tipos restritivos para XStack/YStack/Text; layout usa View/Text do React Native com `style`; Tamagui para Button, Card, Input, Badge, etc.

### Fase 3 — Telas
- Rotas migradas para ScreenContainer, TopBar e mobile-tamagui: `(drawer)/index`, `pair`, `(drawer)/events/[eventId]`, `(drawer)/audit`, `(drawer)/settings`, `modal`, `+not-found`.
- `ConfirmTakeoutModal`: UI com Button/Card/Text/XStack/YStack (Tamagui); lógica de lock/confirm/409/offline inalterada.

### Fase 4 — Testes
- `__tests__/config/tamagui-tokens.invariants.test.ts`: tokens do config (light/dark) com chaves semânticas obrigatórias.
- `__tests__/components/mobile-tamagui.invariants.test.ts`: constantes PAIRING_METHODS e STATUS_PILL_LABELS (sem importar JSX/RN para evitar transform no Jest).

### Fase 5 — Documentação
- Este arquivo (MIGRATION_REPORT.md).
- STYLE_GUIDE.md (tokens e uso).
- Regra 030-style-system atualizada para Tamagui como alvo da migração.

## Correções aplicadas
- `pair.tsx`: import duplicado de View removido.
- `confirm-takeout-modal.tsx`: import duplicado de GestureResponderEvent removido; único import de react-native.

## Pendências (opcionais)
- Remoção completa de HeroUI/Uniwind após validação em produção.
- Atualização de `lib/primitives.ts` e `docs/react-native.md` quando Tamagui for stack único.
- Testes E2E para fluxos críticos (pair, confirm takeout) se necessário.
