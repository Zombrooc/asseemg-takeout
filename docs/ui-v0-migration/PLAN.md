# UI v0 Migration Plan (Phase 0 Inventory)

## Scope and source of truth

- Target app: `apps/native` (Expo Router, React Native).
- Functional contract must be preserved from current mobile code:
  - Pairing (QR/manual), SecureStore persistence, deviceId.
  - Home states (paired/unpaired, reachable/unreachable, loading).
  - Event flow (search, QR scan, summary, participant states, offline queue).
  - Confirm modal with lock acquire/renew/release and conflict handling.
  - Queue processor and realtime updates.
- Local mandatory rules reviewed:
  - `AGENTS.md`
  - `.cursor/rules/takeout-offline.mdc`
  - `.cursor/rules/testing-regression.mdc`
  - `docs/rules/*` (especially style/testing/metro)
  - `apps/native/docs/*`

## External redesign input status (v0 repo)

- Requested redesign source:
  - `https://github.com/Zombrooc/v0-redesenho-ui-tauri/tree/v0/zombrooc-df6034d1/app/mobile`
  - `https://v0.app/chat/redesenho-ui-tauri-oz2kR9DMCCg?ref=34S8JD`
- Current environment limitation: remote tree contents were not retrievable from the session toolchain.
- Mitigation used in this phase:
  - Inventory based on the current `apps/native` implementation (already aligned to prior v0 refactor docs in `apps/native/docs/*`).
  - Mapping below assumes current RN mobile components are the baseline to preserve behavior while replacing the UI system with Tamagui.

## Expo Router inventory (current)

- Root:
  - `apps/native/app/_layout.tsx`
  - `apps/native/app/pair.tsx`
  - `apps/native/app/modal.tsx`
  - `apps/native/app/+not-found.tsx`
- Drawer:
  - `apps/native/app/(drawer)/_layout.tsx`
  - `apps/native/app/(drawer)/index.tsx`
  - `apps/native/app/(drawer)/events/[eventId].tsx`
  - `apps/native/app/(drawer)/audit.tsx`
  - `apps/native/app/(drawer)/settings.tsx`
- Tabs group:
  - `apps/native/app/(drawer)/(tabs)/_layout.tsx`
  - `apps/native/app/(drawer)/(tabs)/index.tsx`
  - `apps/native/app/(drawer)/(tabs)/two.tsx`

## Provider and infra inventory (current)

- Root providers in `app/_layout.tsx`:
  - `QueryClientProvider`
  - `GestureHandlerRootView`
  - `SafeAreaProvider`
  - `KeyboardProvider`
  - `AppThemeProvider`
  - `TakeoutConnectionProvider`
  - `TakeoutQueueProcessor`
  - `HeroUINativeProvider`
- Styling stack:
  - `uniwind` + `global.css`
  - `heroui-native`
  - Utility primitives from `uniwind/components` in `lib/primitives.ts`
- Networking/data:
  - `createTakeoutClient` in `lib/takeout-api.ts`
  - React Query for data fetching and invalidation
  - Offline queue in `lib/takeout-queue.ts`
  - Realtime in `lib/takeout-realtime.ts`

## Screen mapping (v0 -> RN route)

| v0 screen intent | Expo route | Current file | Notes |
| --- | --- | --- | --- |
| Home | `/(drawer)` | `apps/native/app/(drawer)/index.tsx` | Connection status + events list |
| Pair | `/pair` | `apps/native/app/pair.tsx` | QR/manual pair flow |
| Event detail | `/(drawer)/events/[eventId]` | `apps/native/app/(drawer)/events/[eventId].tsx` | Critical takeout flow |
| Audit | `/(drawer)/audit` | `apps/native/app/(drawer)/audit.tsx` | Already implemented |
| Settings/connection | `/(drawer)/settings` | `apps/native/app/(drawer)/settings.tsx` | Unpair/info |
| Modal example | `/modal` | `apps/native/app/modal.tsx` | Non-critical demo route |
| Not found | `+not-found` | `apps/native/app/+not-found.tsx` | Fallback |

## Component inventory (current)

- Shared UI primitives (`apps/native/components/ui`):
  - `Button`, `Input`, `Card`, `Banner`, `Badge`, `Divider`, `IconButton`, `TopBar`, `Screen/Container`, `EmptyState`.
- Home components:
  - `ConnectionStatusCard`, `StatusPill`, `EventCard`, `EventsList`.
- Pair components:
  - `PairingMethodTabs`, `PermissionPrompt`, `QrScannerOverlay`, `ManualPairForm`, `PairingTipsCard`.
- Event components:
  - `EventHeader`, `SearchBar`, `QuickActionsRow`, `SummaryStats`, `QrTicketScannerOverlay`, `OfflineQueueNotice`.
- Takeout critical:
  - `ParticipantListItem`
  - `ConfirmTakeoutModal`
  - `TakeoutQueueProcessor`
- Audit components:
  - `AuditFilters`, `AuditListItem`.

## Tailwind/Uniwind -> Tamagui compatibility risks

1. Current style system rule (`docs/rules/030-style-system.md`) defines HeroUI + Uniwind as official stack.
2. `global.css` + static class extraction assumptions do not apply to Tamagui; build pipeline must be updated safely.
3. `lib/primitives.ts` currently exports from `uniwind/components`; migrating to Tamagui requires a clear replacement strategy.
4. Drawer/tabs headers currently use `useThemeColor` from HeroUI.
5. Existing tests include config invariants for Metro/Expo and dependency resolution; adding Tamagui must not regress those checks.

## Incremental strategy (screen-by-screen)

1. Tamagui setup and bridge:
   - Add Tamagui config + provider while keeping HeroUI/Uniwind active.
   - Do not remove old stack until equivalent screens/components are migrated.
2. Shared primitives:
   - Introduce Tamagui primitives in `components/ui` behind same semantic API where possible.
3. Migrate routes in this order:
   - Home -> Pair -> Event -> Confirm modal -> Audit -> Settings -> Modal/NotFound.
4. After each screen migration:
   - Preserve behavior contract.
   - Add at least one targeted test for main flow.
5. Removal phase:
   - Remove HeroUI/Uniwind only after all migrated routes are stable and tests pass.

## Functional invariants to keep during migration

- Pairing:
  - `POST /pair` with `device_id` + `pairing_token`.
  - Save `baseUrl`, `accessToken`, `deviceId` in SecureStore.
- Event:
  - Client-side search + QR scan selection.
  - Offline queue notice and persistence.
  - Realtime lock states and query invalidation.
  - Reset check-ins and sync sequence behavior.
- Confirm modal:
  - Acquire/renew/release lock lifecycle.
  - Confirm success (`CONFIRMED`/`DUPLICATE`) handling.
  - Conflict `409` handling with user feedback.
  - Offline enqueue fallback.

## Phase 0 deliverables completed

- `docs/ui-v0-migration/PLAN.md` (this file)
- `docs/ui-v0-migration/COMPONENT_MAP.md`
- `docs/ui-v0-migration/KNOWN_ISSUES.md`

## Fase 1 deliverables (Tamagui setup) — implementados

- `apps/native/tamagui.config.ts`: tokens e temas V0 (background, foreground, muted, card, border, accent, success, warning, danger, info, overlay); shorthands p, px, py, m, mx, my, bg, br.
- `apps/native/app/_layout.tsx`: `TamaguiProvider` com config e defaultTheme="light" (bridge com HeroUI).
- `apps/native/package.json`: dependências `tamagui` e `@tamagui/config` adicionadas.
- `apps/native/components/ui-tamagui/`: primitives Button, Card, Input, Separator, Banner, Badge, Spinner, EmptyState.
- **Próximo passo**: Remoção de HeroUI/Uniwind quando estável (ver MIGRATION_REPORT.md).

## Fase 2 e 3 — concluídas

- **Fase 2**: `components/mobile-tamagui/` com equivalentes em Tamagui (home, pair, event, audit, participant-list-item). Por restrições de tipos do Tamagui 1.x, layout usa View/Text do React Native com `style`; Tamagui para Button, Card, Input, Badge, etc.
- **Fase 3**: Telas migradas para usar ScreenContainer, TopBar e componentes de mobile-tamagui: `(drawer)/index`, `pair`, `(drawer)/events/[eventId]`, `(drawer)/audit`, `(drawer)/settings`, `modal`, `+not-found`. `ConfirmTakeoutModal` usa Button/Card/Text/XStack/YStack (Tamagui); imports de react-native unificados (Alert, GestureResponderEvent, Modal, Pressable).
- **Correções**: `pair.tsx` import único de View/Text; `confirm-takeout-modal.tsx` import único de react-native (sem GestureResponderEvent duplicado).
