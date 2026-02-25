# RN UI Full Refactor Report

## Escopo
Relatório consolidado das mudanças de UI em React Native/Expo Router, com foco em telas, componentes, bugs, decisões técnicas e validação manual. Branch: **refactor/RN-UI-Full-refactor**. Alinhado ao plano em `RN_UI_FULL_REFACTOR_PLAN.md`.

---

## 1) Mudanças implementadas por tela/componente

### Navegação e estrutura de telas

| Tela/rota | Implementação RN | Mudança principal |
|---|---|---|
| Root layout | `app/_layout.tsx` | Base de navegação e providers globais centralizados |
| Drawer layout | `app/(drawer)/_layout.tsx` | Drawer com Home, Eventos, **Auditoria**, **Configurações**, Tabs |
| Drawer index (Home) | `app/(drawer)/index.tsx` | Home principal: eventos, status LIVE/OFFLINE, desparear |
| Detalhe de evento | `app/(drawer)/events/[eventId].tsx` | Participantes, busca, scan, reset, modal confirmar |
| **Auditoria** | `app/(drawer)/audit.tsx` | **Nova rota** — GET /audit, filtros (ALL/CONFIRMED/DUPLICATE/FAILED), FlatList |
| **Configurações** | `app/(drawer)/settings.tsx` | **Nova rota** — baseUrl, desparear |
| Pair flow | `app/pair.tsx` | Fluxo isolado fora do drawer (QR + manual) |
| Modal screen | `app/modal.tsx` | Tela de exemplo modal |
| Not found | `app/+not-found.tsx` | Fallback para rotas inválidas |
| Tabs | `app/(drawer)/(tabs)/` | Tab One / two (secundário) |

### Componentes

| Componente | Arquivo RN | Mudança principal |
|---|---|---|
| Container base | `components/container.tsx` | Padronização de espaçamento/layout base |
| Theme toggle | `components/theme-toggle.tsx` | Alternância de tema consistente no app |
| Participant item | `components/takeout/participant-list-item.tsx` | Estados (Confirmado, Locked, Conflito, Pendente, Normal); truncamento; testID |
| Confirm modal | `components/mobile/audit/confirm-takeout-modal.tsx` | Overlay + card; testID confirm/cancel |
| Queue processor | `components/takeout/queue-processor.tsx` | Fila offline |
| ConnectionStatusCard | `components/mobile/home/connection-status-card.tsx` | testID retry/reconnect |
| EventCard / EventsList | `components/mobile/home/` | testID event-card-{eventId} |
| AuditFilters | `components/mobile/audit/audit-filters.tsx` | Status ALL/CONFIRMED/DUPLICATE/FAILED (alinhado à API); testID por opção |
| AuditListItem | `components/mobile/audit/audit-list-item.tsx` | Truncamento ticket_id |
| theme-tokens | `utils/theme-tokens.ts` | Mapas estáticos STATUS_PILL_CLASS, CONNECTION_BG_CLASS, BADGE_STATUS_CLASS |

---

## 2) Bugs encontrados e como foram corrigidos

1. **Inconsistência de estilos por classe dinâmica**
   - **Sintoma:** estilo não aplicado em cenários de variação.
   - **Causa raiz:** composição dinâmica de `className` incompatível com extração estática.
   - **Correção:** substituição por mapa de variantes estático.

2. **Comportamento irregular de modal/backdrop**
   - **Sintoma:** toque fora fechava modal de forma inconsistente.
   - **Causa raiz:** diferenças de implementação entre web e RN modal.
   - **Correção:** padronização de backdrop e handler de fechamento explícito.

3. **Input coberto por teclado em telas com formulário**
   - **Sintoma:** CTA e campos finais ficavam escondidos.
   - **Causa raiz:** ausência de estratégia uniforme de keyboard avoiding.
   - **Correção:** uso combinado de `SafeAreaView` e `KeyboardAvoidingView` nas telas afetadas.

4. **Queda de performance em lista com múltiplos itens**
   - **Sintoma:** lag no scroll e re-render excessivo.
   - **Causa raiz:** itens sem memoização e configuração padrão da lista.
   - **Correção:** otimizações de `FlatList` (`keyExtractor`, memo e janela ajustada).

5. **AuditFilters com status PENDING (inexistente na API)**
   - **Sintoma:** filtro não refletia GET /audit (status: CONFIRMED | DUPLICATE | FAILED).
   - **Correção:** OPTIONS alterado para ALL, CONFIRMED, DUPLICATE, FAILED.

---

## 3) Decisões técnicas

### HeroUI wrapper vs componente custom

**Decisão:** abordagem híbrida com preferência por wrapper quando o componente do design system atende 80-90% da necessidade.

#### Quando usar wrapper de HeroUI
- Componente visualmente estável e reaproveitado em várias telas.
- API do HeroUI já cobre estados (`loading`, `disabled`, `variant`) sem gambiarras.
- Necessidade de consistência com web/design tokens existentes.

#### Quando usar componente custom RN
- Interação altamente específica de mobile (gesto, teclado, safe area, comportamento nativo).
- Sobrecarga de abstração do wrapper geraria props excessivas.
- Necessidade de performance fina em listas/itens complexos.

#### Trade-off adotado
- **Pró wrapper:** velocidade de entrega e consistência visual.
- **Pró custom:** controle fino de UX/performance mobile.
- **Regra final:** começar por wrapper; migrar para custom quando houver evidência de limitação real.

---

## 4) Checklist de validação manual

### Navegação
- [ ] Abrir app e validar rota inicial esperada.
- [ ] Navegar entre tabs sem perda de estado crítico.
- [ ] Abrir fluxo de drawer e acessar detalhe de evento com `eventId` válido.
- [ ] Testar rota inválida e confirmar fallback em `+not-found`.

### UI/UX
- [ ] Verificar paridade visual mínima entre telas migradas.
- [ ] Alternar tema e confirmar contraste adequado.
- [ ] Abrir/fechar modal por ação principal e backdrop.
- [ ] Validar safe area em dispositivos com notch.

### Inputs e teclado
- [ ] Focar campos de input e confirmar que CTA continua visível.
- [ ] Testar submit com teclado aberto e fechado.

### Listas e performance
- [ ] Scroll contínuo em listas longas sem engasgo perceptível.
- [ ] Confirmar que seleção/ações em item não causam re-render global visível.

### Qualidade e observabilidade
- [ ] Todas as ações críticas têm `testID` (home-pair-cta, home-unpair, connection-status-retry/reconnect, pair-submit-button, events-scan-ticket, events-reset-checkins, takeout-confirm-modal-confirm/cancel, participant-confirm-*, audit-filters-*).
- [ ] Fluxos principais sem erro em logs.
- [ ] Regressão rápida dos cenários de takeout/events/audit.

### Testes adicionados (refactor/RN-UI-Full-refactor)
- `__tests__/utils/theme-tokens.test.ts`: mapas estáticos de classes.
- `__tests__/components/audit-filters.invariants.test.ts`: OPTIONS alinhados à API.
- `__tests__/lib/takeout-api.test.ts`: getAudit com e sem params.

---

## Conclusão
A refatoração de UI em RN foi estruturada para reduzir risco técnico e operacional, mantendo entrega incremental por rotas/componentes e regras claras para estilo, navegação e testabilidade.
