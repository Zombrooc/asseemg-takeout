# RN UI Full Refactor Report

## Escopo
Relatório consolidado das mudanças de UI em React Native/Expo Router, com foco em telas, componentes, bugs, decisões técnicas e validação manual.

---

## 1) Mudanças implementadas por tela/componente

### Navegação e estrutura de telas

| Tela/rota | Implementação RN | Mudança principal |
|---|---|---|
| Root layout | `app/_layout.tsx` | Base de navegação e providers globais centralizados |
| Drawer layout | `app/(drawer)/_layout.tsx` | Organização do fluxo principal em navegação lateral |
| Tabs layout | `app/(drawer)/(tabs)/_layout.tsx` | Separação das telas de acesso frequente |
| Home tab | `app/(drawer)/(tabs)/index.tsx` | Primeira experiência pós-login/foco principal |
| Tab secundária | `app/(drawer)/(tabs)/two.tsx` | Tela auxiliar migrada para padrão RN |
| Drawer index | `app/(drawer)/index.tsx` | Entrypoint do grupo drawer |
| Detalhe de evento | `app/(drawer)/events/[eventId].tsx` | Uso de rota dinâmica com param tipado |
| Pair flow | `app/pair.tsx` | Fluxo isolado mantido fora de drawer/tabs |
| Modal screen | `app/modal.tsx` | Tratamento de apresentação modal no roteador |
| Not found | `app/+not-found.tsx` | Cobertura de fallback para rotas inválidas |

### Componentes

| Componente | Arquivo RN | Mudança principal |
|---|---|---|
| Container base | `components/container.tsx` | Padronização de espaçamento/layout base |
| Theme toggle | `components/theme-toggle.tsx` | Alternância de tema consistente no app |
| Participant item | `components/takeout/participant-list-item.tsx` | Render de item de lista com estados claros |
| Confirm modal | `components/takeout/confirm-takeout-modal.tsx` | Confirmação crítica com foco em UX/acessibilidade |
| Queue processor | `components/takeout/queue-processor.tsx` | Encapsulamento de processamento assíncrono |

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
- [ ] Todas as ações críticas têm `testID`.
- [ ] Fluxos principais sem erro em logs.
- [ ] Regressão rápida dos cenários de takeout/events.

---

## Conclusão
A refatoração de UI em RN foi estruturada para reduzir risco técnico e operacional, mantendo entrega incremental por rotas/componentes e regras claras para estilo, navegação e testabilidade.
