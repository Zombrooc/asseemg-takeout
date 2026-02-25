# UI v0 -> RN Component Map

## Route-level components

| v0 intent | Current RN implementation | Target Tamagui replacement | Behavior contract |
| --- | --- | --- | --- |
| App shell/layout | `app/_layout.tsx` + `components/ui/screen.tsx` | `TamaguiProvider` + Tamagui screen primitives | Keep provider order and queue processor active |
| Home screen | `app/(drawer)/index.tsx` | Same route with Tamagui UI composition | Preserve connection states and events loading logic |
| Pair screen | `app/pair.tsx` | Same route with Tamagui form/scanner wrappers | Preserve QR/manual pairing behavior |
| Event screen | `app/(drawer)/events/[eventId].tsx` | Same route with Tamagui list/actions | Preserve search/scan/reset/realtime/offline queue |
| Audit screen | `app/(drawer)/audit.tsx` | Same route with Tamagui filters/list | Preserve `GET /audit` filters and empty/loading states |
| Settings screen | `app/(drawer)/settings.tsx` | Same route with Tamagui sections/actions | Preserve unpair flow |
| Confirm modal | `components/mobile/audit/confirm-takeout-modal.tsx` | Tamagui `Dialog`/`Sheet` version | Preserve lock + confirm + conflict + queue fallback |

## Shared UI primitives

| Current RN component | File | Core props used now | Tamagui equivalent plan |
| --- | --- | --- | --- |
| `Container` / `Screen` | `components/ui/screen.tsx` | `mode`, `className`, `contentClassName`, `keyboardAware` | Keep API; implement with Tamagui `YStack` + RN Scroll/FlatList wrappers |
| `TopBar` | `components/ui/top-bar.tsx` | `title`, `subtitle`, `actionSlot`, `rightSlot` | Implement with `XStack`/`YStack` + themed typography |
| `Button` | `components/ui/button.tsx` | variants, loading, disabled, `testID` | Tamagui `Button` wrapper with semantic variants |
| `Input` | `components/ui/input.tsx` | controlled input props + states | Tamagui `Input` wrapper |
| `Card` | `components/ui/card.tsx` | variant + container styles | Tamagui `Card` wrapper |
| `Banner` | `components/ui/banner.tsx` | variant container + optional actions | Tamagui alert/banner primitive |
| `Badge` | `components/ui/badge.tsx` | status visual markers | Tamagui badge chip |
| `Divider` | `components/ui/divider.tsx` | separators between sections | Tamagui separator |
| `EmptyState` | `components/ui/empty-state.tsx` | icon/title/description/cta | Tamagui empty state primitive |
| `IconButton` | `components/ui/icon-button.tsx` | icon action button | Tamagui button icon variant |

## Home

| v0 intent | Current RN component | File | Key props/states |
| --- | --- | --- | --- |
| Connectivity summary | `ConnectionStatusCard` | `components/mobile/home/connection-status-card.tsx` | `isReachable`, `isConnecting`, `baseUrl`, `onRetry`, `onDisconnect` |
| Live/offline pill | `StatusPill` | `components/mobile/home/status-pill.tsx` | `isReachable` |
| Event item card | `EventCard` | `components/mobile/home/event-card.tsx` | Event summary + `onPress` |
| Event list container | `EventsList` | `components/mobile/home/events-list.tsx` | loading, empty, list rendering, open event callback |

## Pair

| v0 intent | Current RN component | File | Key props/states |
| --- | --- | --- | --- |
| Method switch (QR/manual) | `PairingMethodTabs` | `components/mobile/pair/pairing-method-tabs.tsx` | `method`, `onChange` |
| Camera permission UI | `PermissionPrompt` | `components/mobile/pair/permission-prompt.tsx` | title, description, confirm/back callbacks |
| QR scanner frame overlay | `QrScannerOverlay` | `components/mobile/pair/qr-scanner-overlay.tsx` | description, cancel |
| Manual pair form | `ManualPairForm` | `components/mobile/pair/manual-pair-form.tsx` | baseUrl/token fields, submit, loading, error |
| Pair tips | `PairingTipsCard` | `components/mobile/pair/pairing-tips-card.tsx` | static guidance |

## Event

| v0 intent | Current RN component | File | Key props/states |
| --- | --- | --- | --- |
| Event title/status | `EventHeader` | `components/mobile/event/event-header.tsx` | title, subtitle, live status |
| Search field | `SearchBar` | `components/mobile/event/search-bar.tsx` | search value/change |
| Actions row | `QuickActionsRow` | `components/mobile/event/quick-actions-row.tsx` | scan/reset actions, loading/count |
| Summary metrics | `SummaryStats` | `components/mobile/event/summary-stats.tsx` | total/confirmed/pending/pendingSync |
| Ticket scan overlay | `QrTicketScannerOverlay` | `components/mobile/event/qr-ticket-scanner-overlay.tsx` | back action |
| Offline queue notice | `OfflineQueueNotice` | `components/mobile/event/offline-queue-notice.tsx` | visible state |
| Participant row | `ParticipantListItem` | `components/takeout/participant-list-item.tsx` | confirmed/pending/conflict/locked + actions |

## Audit

| v0 intent | Current RN component | File | Key props/states |
| --- | --- | --- | --- |
| Filters | `AuditFilters` | `components/mobile/audit/audit-filters.tsx` | `ALL|CONFIRMED|DUPLICATE|FAILED` |
| Row/list item | `AuditListItem` | `components/mobile/audit/audit-list-item.tsx` | request/ticket/status/timestamps |
| Confirm modal reuse | `ConfirmTakeoutModal` | `components/mobile/audit/confirm-takeout-modal.tsx` | used in event detail flow |

## Logic components (must stay behavior-compatible)

| Component | File | Contract |
| --- | --- | --- |
| `TakeoutQueueProcessor` | `components/takeout/queue-processor.tsx` | Poll queue when reachable, retry with backoff, remove on CONFIRMED/DUPLICATE/409 |
| `TakeoutConnectionProvider` | `contexts/takeout-connection-context.tsx` | SecureStore persistence + periodic `/health` reachability |
| `createTakeoutClient` | `lib/takeout-api.ts` | HTTP contract for pair/events/audit/locks/sync |

## Notes for migration

- `lib/primitives.ts` is currently tied to `uniwind/components`; Tamagui migration should either:
  - replace this primitive layer, or
  - keep it temporarily and migrate each component to Tamagui primitives directly.
- All critical buttons and inputs already rely on stable `testID` naming; keep existing IDs where possible to reduce E2E churn.
