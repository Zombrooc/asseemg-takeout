# RN UI Full Refactor Plan

## Objetivo
Migrar a camada de UI legada (v0) para React Native + Expo Router com baixo risco, mantendo paridade funcional e permitindo rollout incremental por tela.

---

## 1) Mapa de rotas `v0 -> Expo Router`

| v0 (web/legado) | Expo Router (destino) | Arquivo RN | Status sugerido |
|---|---|---|---|
| `/` (home) | `/(drawer)/(tabs)` | `app/(drawer)/(tabs)/index.tsx` | Migrar primeiro |
| `/two` (screen secundária) | `/(drawer)/(tabs)/two` | `app/(drawer)/(tabs)/two.tsx` | Migrar junto dos tabs |
| `/drawer` (entry do drawer) | `/(drawer)` | `app/(drawer)/index.tsx` | Consolidar navegação |
| `/events/:eventId` | `/(drawer)/events/[eventId]` | `app/(drawer)/events/[eventId].tsx` | Migração com params |
| `/pair` | `/pair` | `app/pair.tsx` | Fluxo isolado |
| `/modal` | `/modal` | `app/modal.tsx` | Validar sobreposição |
| `*` (404) | `+not-found` | `app/+not-found.tsx` | Fechar cobertura |

### Regras de mapeamento
1. Rotas dinâmicas do v0 devem virar segmentos `[param]` no Expo Router.
2. Agrupamentos de navegação (drawer/tabs) ficam entre parênteses para não poluir pathname final.
3. Rotas modais devem viver fora de grupos quando precisarem de apresentação global.

---

## 2) Mapa de componentes `v0 -> RN`

| v0 (legado) | Equivalente RN | Arquivo RN | Observações |
|---|---|---|---|
| `LayoutContainer` | `Container` | `components/container.tsx` | Wrapper base de spacing/background |
| `ThemeSwitch` | `ThemeToggle` | `components/theme-toggle.tsx` | Integrar estado de tema global |
| `ParticipantItem` | `ParticipantListItem` | `components/takeout/participant-list-item.tsx` | Preservar estados de seleção |
| `ConfirmModal` | `ConfirmTakeoutModal` | `components/takeout/confirm-takeout-modal.tsx` | Tratar backdrop e acessibilidade |
| `QueueWorker` | `QueueProcessor` | `components/takeout/queue-processor.tsx` | Evitar re-render em lote |
| `EventDetailsPage` | `EventDetailsScreen` | `app/(drawer)/events/[eventId].tsx` | Conectar params + dados |

### Estratégia de adaptação de componentes
- Priorizar troca de componentes de layout/base antes de componentes de domínio.
- Garantir equivalência visual mínima antes de otimizações.
- Introduzir `testID` ao migrar qualquer ação crítica.

---

## 3) Principais riscos de migração

### 3.1 Classes dinâmicas (Uniwind/Tailwind)
- **Risco:** classes montadas por template string quebram extração estática.
- **Impacto:** estilos ausentes em runtime e inconsistência visual.
- **Mitigação:** usar mapas estáticos (`variant -> className`) + fallback explícito.

### 3.2 Modal / backdrop
- **Risco:** diferenças entre web modal e `Modal` nativo (z-index, toque fora, animação).
- **Impacto:** fechamento acidental, bloqueio de interação, UX inconsistente.
- **Mitigação:** padronizar wrapper de modal com backdrop tocável, `onRequestClose`, e teste em Android/iOS.

### 3.3 Keyboard / Safe Area
- **Risco:** inputs podem ficar encobertos pelo teclado e por recortes de tela.
- **Impacto:** perda de usabilidade em formulários/confirm actions.
- **Mitigação:** combinar `SafeAreaView` + `KeyboardAvoidingView` por tela com input crítico.

### 3.4 Performance de FlatList
- **Risco:** regressão de scroll e jank em listas longas após migração.
- **Impacto:** baixa responsividade em dispositivos médios.
- **Mitigação:** configurar `keyExtractor`, `getItemLayout` (quando possível), memoização de item e `windowSize` adequado.

---

## 4) Estratégia incremental de commits

1. **Commit 1 — Infra de navegação**
   - Estruturar grupos `(drawer)` / `(tabs)` e alinhar `_layout.tsx`.
   - Sem mudança visual ampla.

2. **Commit 2 — Tokens + componentes base**
   - Migrar `Container`, wrappers visuais e tema.
   - Garantir que Uniwind use classes estáticas.

3. **Commit 3 — Telas de baixa complexidade**
   - Home/tab secundária/modal simples.
   - Validar navegação, tema e safe area.

4. **Commit 4 — Fluxos de domínio (takeout/events)**
   - Migrar componentes `participant`, `confirm modal`, `queue processor`.
   - Foco em estado, loading e ações críticas.

5. **Commit 5 — Performance e hardening**
   - Ajustes de `FlatList`, memoização, acessibilidade e `testID`.
   - Rodar regressão manual orientada por checklist.

6. **Commit 6 — Limpeza e remoção de legado**
   - Remover código v0 não utilizado.
   - Atualizar documentação final e critérios de aceite.

---

## Critérios de aceite do plano
- Paridade funcional das rotas mapeadas.
- Sem classe dinâmica em componentes novos/migrados.
- Ações críticas cobertas por `testID`.
- Sem regressão crítica de navegação, modal e listas.
