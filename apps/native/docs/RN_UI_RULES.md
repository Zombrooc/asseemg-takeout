# RN UI Rules

## Objetivo
Definir convenções obrigatórias para consistência de UI no app React Native com Expo Router e Uniwind.

---

## 1) `className` estático para Uniwind (obrigatório)

### Regra
- **Não usar** composição dinâmica livre de classes (`string` interpolada diretamente).
- **Sempre usar** valores estáticos previsíveis por mapa de variantes.

### ✅ Padrão aceito
```ts
const buttonVariants = {
  primary: 'bg-primary-600 text-white',
  secondary: 'bg-neutral-100 text-neutral-900',
} as const

const klass = buttonVariants[variant] ?? buttonVariants.primary
```

### ❌ Padrão proibido
```ts
const klass = `bg-${color}-600 text-${tone}`
```

### Motivação
Uniwind depende de extração estática para gerar classes; padrões dinâmicos causam perda de estilo em runtime.

### ✅ Padrão aceito (estado visual por objeto de classes)
```ts
const statusClassMap = {
  success: 'text-success text-xs mt-1',
  warning: 'text-warning text-xs mt-1',
  danger: 'text-danger text-xs mt-1',
  neutral: '',
} as const

const statusClassName =
  statusTone === null ? statusClassMap.neutral : statusClassMap[statusTone]
```

### ❌ Antipadrão (condicional extensa ou concatenação imprevisível)
```ts
const statusClassName =
  statusTone === 'success'
    ? `text-${statusTone} text-xs mt-1`
    : statusTone === 'warning'
      ? 'text-warning text-xs mt-1'
      : statusTone === 'danger'
        ? 'text-danger text-xs mt-1'
        : ''
```

---

## 2) Tokens semânticos

### Regra
- Evitar cor crua (`#hex`) em componentes de tela.
- Usar sempre tokens semânticos (ex.: `bg-surface`, `text-foreground`, `border-subtle`, `bg-primary`).
- Tokens de estado devem refletir intenção, não implementação visual:
  - `success`, `warning`, `danger`, `info`.

### Convenções
- **Background:** `surface`, `surface-muted`, `surface-elevated`.
- **Texto:** `foreground`, `foreground-muted`, `foreground-inverse`, `card-foreground`.
- **Ação:** `primary`, `primary-foreground`, `accent`.
- **Borda/divisor:** `border`, `border-subtle`.
- **Estado:** `success`, `success-foreground`, `warning`, `warning-foreground`, `danger`, `danger-foreground`.

### Motivação
Semântica desacopla componente de paleta fixa e facilita dark mode/tematização.

---

## 3) Naming de rotas Expo Router

### Regra
- Arquivos de rota em `kebab-case` ou segmentos especiais do Expo Router.
- Segmentos dinâmicos **sempre** em `[param]`.
- Grupos de organização em `(group)` sem expor no path final.

### Exemplos
- `app/(drawer)/(tabs)/index.tsx`
- `app/(drawer)/events/[eventId].tsx`
- `app/+not-found.tsx`

### Padrões adicionais
- Uma tela por arquivo de rota.
- `_layout.tsx` apenas para estrutura de navegação/providers daquele nível.
- Evitar lógica de domínio extensa em arquivo de rota; mover para componentes/hooks.

---

## 4) `testID` obrigatório em ações críticas

### Regra
Toda ação crítica deve ter `testID` explícito e estável.

### Ações críticas (mínimo)
- Botão de confirmar/cancelar de modais.
- CTA primário de submit.
- Ações destrutivas (remover, sair, encerrar).
- Elementos de navegação de fluxo principal.

### Convenção de nome
`<contexto>-<componente>-<ação>`

#### Exemplos
- `takeout-confirm-modal-confirm`
- `takeout-confirm-modal-cancel`
- `events-detail-join-button`
- `pair-submit-button`

### Motivação
Facilita testes E2E/regressão e reduz flakiness por seleção frágil de elementos.

---

## Critérios de revisão (PR checklist)
- [ ] Nenhum `className` dinâmico fora de mapas estáticos.
- [ ] Tokens semânticos usados em vez de cores cruas.
- [ ] Rotas seguem convenção de nome/grupo/dinâmico do Expo Router.
- [ ] Ações críticas cobertas com `testID` estável.
