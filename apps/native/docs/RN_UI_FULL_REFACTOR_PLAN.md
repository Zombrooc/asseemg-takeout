# RN UI Full Refactor Plan

## Objetivo

Migrar a UI do Takeout Mobile para espelhar a UI v0 (React web em [v0-redesenho-ui-tauri](https://github.com/Zombrooc/v0-redesenho-ui-tauri) branch `v0/zombrooc-df6034d1` — `app/mobile` + `components/mobile`), mantendo 100% da funcionalidade existente. Stack: Expo Router (file-based), Uniwind (Tailwind-like), HeroUI Native. Branch: **refactor/RN-UI-Full-refactor**.

---

## 1) Mapa de telas/rotas v0 → Expo Router

| v0            | Expo Router                     | Arquivo RN                        | Observação                                              |
| ------------- | ------------------------------- | --------------------------------- | ------------------------------------------------------- |
| home          | `(drawer)/index`                | `app/(drawer)/index.tsx`          | Home principal (eventos + status) — tela de eventos atual |
| pair          | `/pair`                         | `app/pair.tsx`                    | Fora do drawer — já existe                               |
| event         | `(drawer)/events/[eventId]`     | `app/(drawer)/events/[eventId].tsx` | Já existe                                              |
| audit         | `(drawer)/audit`                | `app/(drawer)/audit.tsx`           | **Criar** — GET /audit, filtros, listagem               |
| settings      | `(drawer)/settings`             | `app/(drawer)/settings.tsx`        | **Opcional** — desparear, informações                   |
| confirm-modal | (componente)                    | —                                 | Modal em tela de evento, não rota                       |
| example-modal | `/modal`                        | `app/modal.tsx`                   | Já existe                                               |
| not-found     | `+not-found`                    | `app/+not-found.tsx`              | Já existe                                               |

### Regras de mapeamento

1. Rotas dinâmicas do v0 viram segmentos `[param]` no Expo Router.
2. Grupos (drawer/tabs) ficam entre parênteses.
3. Modal de confirmar takeout é componente, não rota; `modal.tsx` é tela de exemplo.

---

## 2) Mapa de componentes v0 → RN

| v0 (web/legado)     | Equivalente RN              | Arquivo RN                                       | Observações                          |
| ------------------- | --------------------------- | ------------------------------------------------ | ------------------------------------ |
| LayoutContainer     | Container / Screen          | `components/container.tsx`, `components/ui/screen.tsx` | Wrapper base spacing/background      |
| ThemeSwitch         | ThemeToggle                 | `components/theme-toggle.tsx`                     | Tema global                          |
| Status card (home)  | ConnectionStatusCard        | `components/mobile/home/connection-status-card.tsx` | loading/paired/reachable/unreachable |
| Status pill         | StatusPill                  | `components/mobile/home/status-pill.tsx`         | LIVE/OFFLINE                          |
| Event card/list     | EventCard, EventsList       | `components/mobile/home/event-card.tsx`, `events-list.tsx` | Lista de eventos                     |
| PairingMethodTabs   | PairingMethodTabs           | `components/mobile/pair/pairing-method-tabs.tsx`  | Abas QR / Manual                     |
| PermissionPrompt    | PermissionPrompt            | `components/mobile/pair/permission-prompt.tsx`    | Câmera                                |
| QrScannerOverlay    | QrScannerOverlay            | `components/mobile/pair/qr-scanner-overlay.tsx`   | Scanner + CTA cancelar               |
| ManualPairForm      | ManualPairForm              | `components/mobile/pair/manual-pair-form.tsx`     | URL + token                          |
| PairingTipsCard     | PairingTipsCard             | `components/mobile/pair/pairing-tips-card.tsx`    | Dicas                                |
| EventHeader         | EventHeader                 | `components/mobile/event/event-header.tsx`        | Título + ações                       |
| SearchBar           | SearchBar                   | `components/mobile/event/search-bar.tsx`          | Busca client-side                    |
| QuickActionsRow     | QuickActionsRow             | `components/mobile/event/quick-actions-row.tsx`   | Scan, reset, etc.                    |
| SummaryStats        | SummaryStats                | `components/mobile/event/summary-stats.tsx`       | Resumo contadores                    |
| ParticipantItem     | ParticipantListItem         | `components/takeout/participant-list-item.tsx`    | Estados: Confirmado, Locked, Conflito, Pendente, Normal |
| OfflineQueueNotice  | OfflineQueueNotice          | `components/mobile/event/offline-queue-notice.tsx`| Banner fila offline                  |
| QrTicketScannerOverlay | QrTicketScannerOverlay   | `components/mobile/event/qr-ticket-scanner-overlay.tsx` | Scan ingresso                        |
| ConfirmModal        | ConfirmTakeoutModal         | `components/mobile/audit/confirm-takeout-modal.tsx` | Overlay + card + seções + botões     |
| QueueWorker         | TakeoutQueueProcessor       | `components/takeout/queue-processor.tsx`          | Fila offline                         |
| AuditFilters        | AuditFilters                | `components/mobile/audit/audit-filters.tsx`       | Filtros auditoria                    |
| Audit list item     | AuditListItem               | `components/mobile/audit/audit-list-item.tsx`    | Item da lista GET /audit              |
| TopBar              | TopBar                      | `components/ui/top-bar.tsx`                       | Título/subtítulo/actions             |
| Card, Badge, Banner | Card, Badge, Banner         | `components/ui/card.tsx`, `badge.tsx`, `banner.tsx` | HeroUI ou wrapper                     |
| Button, Input       | Button, Input               | `components/ui/button.tsx`, `input.tsx`           | HeroUI Native                        |
| Divider, IconButton | Divider, IconButton         | `components/ui/divider.tsx`, `icon-button.tsx`   | Primitivos                           |

### Estratégia

- Preferir HeroUI Native quando existir; senão View/Text/Pressable com classes estáticas (mapas de variante).
- Introduzir `testID` em todas as ações críticas (parear, conectar, escanear, confirmar, reset, desparear).

---

## 3) Riscos de migração

### 3.1 Classes dinâmicas (Uniwind/Tailwind)

- **Risco:** classes montadas por template string quebram extração estática.
- **Impacto:** estilos ausentes em runtime.
- **Mitigação:** mapas estáticos (`variant -> className`) ou props HeroUI (`color`/`variant`); ver RN_UI_RULES.md.

### 3.2 Modal / backdrop

- **Risco:** diferenças web vs `Modal` RN (z-index, toque fora, animação).
- **Mitigação:** backdrop tocável, `onRequestClose`, testes Android/iOS.

### 3.3 Keyboard / Safe Area

- **Risco:** inputs cobertos pelo teclado ou recortes.
- **Mitigação:** `SafeAreaView` + `KeyboardAvoidingView` / KeyboardProvider (já no layout).

### 3.4 Performance FlatList

- **Risco:** jank em listas longas.
- **Mitigação:** `keyExtractor`, `getItemLayout` (quando possível), memoização de item, `windowSize` adequado, `removeClippedSubviews`.

---

## 4) Plano incremental por commits (FASE 6)

1. **Commit 1 — Branch + docs do plano**  
   Branch `refactor/RN-UI-Full-refactor`; atualizar este documento (mapa rotas, componentes, riscos, commits).

2. **Commit 2 — Ajustes styling infra**  
   global.css @source, tokens, regra className estática (se necessário).

3. **Commit 3 — Design system components**  
   Completar/ajustar wrappers e componentes mobile (ui/ + mobile/).

4. **Commit 4 — Home**  
   Tela Home (drawer index) com nova UI; manter lógica eventos + pareamento.

5. **Commit 5 — Pair**  
   Tela Pair com nova UI; QR + manual; SecureStore.

6. **Commit 6 — Event**  
   Tela Event (participantes, busca, scan, reset, modal confirmar).

7. **Commit 7 — Modal Confirm**  
   ConfirmTakeoutModal (lock, confirmar, offline enfileira).

8. **Commit 8 — Audit**  
   Rota `(drawer)/audit.tsx` + GET /audit + filtros + listagem.

9. **Commit 9 — Testes e mocks**  
   Unit + integração; testIDs; mocks SecureStore, API, realtime.

10. **Commit 10 — Docs finais e regras**  
    RN_UI_FULL_REFACTOR_REPORT.md; RN_UI_RULES.md; checklist manual.

---

## Critérios de aceite

- Paridade funcional das rotas mapeadas (incl. audit).
- Nenhuma classe dinâmica em componentes novos/migrados.
- Ações críticas com `testID`.
- Sem regressão de navegação, modal e listas (FlatList estável).
