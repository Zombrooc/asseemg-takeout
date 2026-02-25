# Relatório de Migração — UI Redesign v0

Migração do layout/UI do redesign ([v0-redesenho-ui-tauri](https://github.com/Zombrooc/v0-redesenho-ui-tauri)) para o app Tauri (React + TanStack Router), preservando funcionalidades existentes.

---

## O que foi migrado

### Design system
- **Tokens de cor** em `src/index.css`: `--color-primary`, `--color-success`, `--color-warning`, `--color-error`, `--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-primary-light` (light e dark).
- **Tipografia**: Geist Variable e Geist Mono Variable via `@fontsource-variable/geist` e `@fontsource-variable/geist-mono`; `--font-sans` e `--font-mono` no `@theme`.
- **Componente shadcn**: Collapsible adicionado em `src/components/ui/collapsible.tsx`.

### Componentes customizados
| Componente        | Ficheiro                    | Uso principal                          |
|-------------------|-----------------------------|----------------------------------------|
| Header            | `components/header.tsx`     | Navegação global, item ativo por rota  |
| StatusCard        | `components/status-card.tsx`| Status servidor/rede no dashboard      |
| StatusBadge       | `components/status-badge.tsx`| Badge de status em tabelas             |
| EventCard         | `components/event-card.tsx`  | Card de evento no grid (dashboard)    |
| PairingSection    | `components/pairing-section.tsx` | QR + URL + Copiar/Renovar token   |
| EventSummary      | `components/event-summary.tsx`  | Totais/confirmados/pendentes/%    |
| ParticipantsTable | `components/participants-table.tsx` | Tabela participantes + confirmar |
| AuditFilters      | `components/audit-filters.tsx`   | Filtro status + busca + limpar    |
| AuditLogTable     | `components/audit-log-table.tsx`  | Tabela auditoria + export CSV    |
| BreadcrumbNav     | `components/breadcrumb-nav.tsx`   | Breadcrumbs (ex.: evento)         |

### Telas
- **Dashboard** (`/`): StatusCard (servidor + rede), PairingSection, grid EventCard, secção “Arquivo” com Collapsible. Lógica mantida: getEvents, getHealth, getNetworkAddresses, getConnectionInfo, renewPairingToken, archive/unarchive/delete.
- **Event Details** (`/events/$eventId`): BreadcrumbNav, EventSummary, ParticipantsTable (com coluna QR em dev). Mantidos: useTakeoutWs, getEventParticipants, postTakeoutConfirm.
- **Import** (`/import`): Upload com drag-and-drop, info box, preview table, botão “Importar e Salvar”. Mantidos: postImportJson, validação JSON, estado parsed/participants.
- **Auditoria** (`/audit`): AuditFilters (status + busca) + AuditLogTable + export CSV. Mantidos: getAudit, filtros, busca no cliente.

---

## Diferenças intencionais

- **Rotas**: Mantidas como estão (`/`, `/import`, `/audit`, `/events/$eventId`). Nenhuma rota Next ou `app/` introduzida.
- **Navegação**: Apenas TanStack Router (`Link`, `useRouterState`). Nenhum `next/link` ou `next/navigation`.
- **Participant count no dashboard**: EventCard no dashboard usa `participantCount={0}` porque `EventSummary` da API não expõe contagem; o detalhe do evento mostra totais reais.
- **Audit**: Export CSV implementado no cliente (filteredLogs). Retry por evento de auditoria não implementado (API não expõe retry); botão “Retry” no AuditLogTable fica disponível quando `onRetry` for passado.

---

## Como rodar e testar

```bash
# Raiz do monorepo
pnpm install
pnpm run typecheck
pnpm run test          # inclui test:unit em apps/web + test:integration

# Só apps/web
cd apps/web
pnpm run dev           # Vite (http://localhost:3001)
pnpm run desktop:dev   # Tauri + Vite + API Rust (5555)
pnpm run test:unit     # Vitest
pnpm run build
pnpm run desktop:build # Tauri build
```

### Testes de não-regressão (unit)
- `StatusBadge`: labels por status (confirmed, pending, duplicate, failed) e label custom.
- `ParticipantsTable`: título, contadores, nomes, badges, clique em “Confirmar” chama `onConfirm` com o participante correto.
- `AuditFilters`: alteração do select chama `onStatusChange`; “Limpar” chama `onClear`.

---

## Checklist de regressão manual

- [ ] Abrir app → Dashboard mostra status servidor/rede, QR de pareamento, grid de eventos.
- [ ] Clicar “Ver Participantes” num evento → página do evento com resumo e tabela; confirmar um participante atualiza estado e toast.
- [ ] Menu do evento (⋮) → Arquivar / Desarquivar / Apagar funciona.
- [ ] Secção “Arquivo” no dashboard expande e mostra eventos arquivados.
- [ ] Importar: selecionar JSON válido → preview → “Importar e Salvar” → toast e dados corretos.
- [ ] Auditoria: filtrar por status, buscar por ticket/dispositivo, “Limpar”, “Exportar CSV”.
- [ ] Header: links Dashboard / Importar / Auditoria; item ativo conforme rota.
- [ ] Nenhum import de `next/*` no código.

---

## Referências

- [PLAN_UI_MIGRATION.md](./PLAN_UI_MIGRATION.md) — mapeamento e estratégia.
- Redesign: [README_REDESIGN.md](https://github.com/Zombrooc/v0-redesenho-ui-tauri/blob/master/README_REDESIGN.md), [DESIGN_SYSTEM.md](https://github.com/Zombrooc/v0-redesenho-ui-tauri/blob/master/DESIGN_SYSTEM.md), [COMPONENTS.md](https://github.com/Zombrooc/v0-redesenho-ui-tauri/blob/master/COMPONENTS.md).
