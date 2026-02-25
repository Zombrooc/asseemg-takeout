# UI v0 Migration Known Issues

## Open issues (Phase 0)

1. External v0 source not readable from current session tools
- Impact: direct file-by-file diff against `v0-redesenho-ui-tauri/app/mobile` could not be completed in this phase.
- Mitigation: inventory and mapping were built from the current RN app and existing internal refactor docs (`apps/native/docs/*`).
- Follow-up: when remote access is available, run a strict parity pass and append deltas here.

2. Current style-system rule conflicts with Tamagui migration goal
- Current documented policy (`docs/rules/030-style-system.md`) states official stack as HeroUI Native + Uniwind.
- Impact: migration requires coordinated rule update to avoid governance inconsistency.
- Mitigation: keep bridge mode during migration and update rules only when Tamagui baseline is stable.

3. Existing UI stack is deeply integrated in root layout and primitives
- `app/_layout.tsx` depends on `HeroUINativeProvider`.
- `lib/primitives.ts` depends on `uniwind/components`.
- `global.css` and Metro config are tuned for Uniwind extraction.
- Impact: direct replacement in one step is high risk for regressions.
- Mitigation: phased replacement with compatibility wrappers and regression tests after each route migration.

4. Potential encoding noise in legacy text content
- Some files contain mojibake in PT-BR strings (e.g., accented text shown incorrectly in terminal output).
- Impact: can create noisy diffs while touching UI copy.
- Mitigation: avoid unrelated text rewrites during structural migration; normalize only when editing affected file intentionally.

## Fase 1 (Tamagui setup) — concluída

- **Tokens e temas**: `apps/native/tamagui.config.ts` criado com cores do V0 (background, foreground, muted, card, border, accent, success, warning, danger, info, overlay) e shorthands (p, px, py, m, mx, my, bg, br).
- **Provider**: `TamaguiProvider` adicionado em `app/_layout.tsx` (dentro de HeroUINativeProvider), `defaultTheme="light"`.
- **Primitives Tamagui**: `components/ui-tamagui/` com Button, Card, Input, Separator, Banner, Badge, Spinner, EmptyState (bridge; não substituem ainda os de `components/ui`).
- **Dependências**: `tamagui` e `@tamagui/config` adicionados em `package.json`. Rodar `pnpm install` na raiz ou em `apps/native` para resolver módulos.

## Fase 2 e 3 — concluídas

- **mobile-tamagui**: Componentes convertidos para View/Text (RN) + estilo inline onde Tamagui 1.x não expõe props de layout nos tipos; Button, Card, Input, Badge, etc. continuam de ui-tamagui.
- **Telas**: Todas as rotas listadas no plano passam a usar ScreenContainer, TopBar e mobile-tamagui.
- **confirm-takeout-modal**: Import duplicado `GestureResponderEvent` removido (único import de react-native: Alert, GestureResponderEvent, Modal, Pressable).

## Risks to monitor during next phases

1. Build-time styling regressions after introducing Tamagui.
2. Drawer/tabs theming regressions because current colors come from `useThemeColor` (HeroUI).
3. Participant list performance regressions if memoization or FlatList tuning is lost.
4. Confirm modal behavior regressions (overlay close, lock lifecycle, 409 conflict path).
5. Test drift if `testID` names change during component rewrites.
