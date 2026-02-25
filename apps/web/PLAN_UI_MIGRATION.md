# Plano de Migração UI — Redesign v0

Documento de mapeamento e estratégia para integrar o layout/UI do redesign (repo [v0-redesenho-ui-tauri](https://github.com/Zombrooc/v0-redesenho-ui-tauri)) no app Tauri (React + TanStack Router), preservando 100% das funcionalidades.

---

## 1. Mapeamento rota atual → tela do redesign

| Rota atual (TanStack) | Arquivo atual | Tela redesign | Observação |
|----------------------|---------------|---------------|------------|
| `/` | `src/routes/index.tsx` | Dashboard (app/page.tsx) | Status cards, PairingSection, grid EventCard, arquivo colapsível |
| `/events/$eventId` | `src/routes/events.$eventId.tsx` | Event Details (app/events/[id]/page.tsx) | EventSummary + ParticipantsTable; manter useTakeoutWs, confirmMutation, getEventParticipants |
| `/import` | `src/routes/import.tsx` + ImportPage | Importar (app/import/page.tsx) | Upload area, info box, preview table; manter postImportJson, validação JSON |
| `/audit` | `src/routes/audit.tsx` + AuditPage | Auditoria (app/audit/page.tsx) | AuditFilters + AuditLogTable; manter getAudit, filtros, params |

---

## 2. Mapeamento componentes atuais → redesign

| Componente atual | Componente redesign | Ação |
|------------------|---------------------|------|
| `header.tsx` | Header (currentPage, nav ativo) | Substituir markup/estilos; manter Link de @tanstack/react-router |
| ServerStatus + NetworkAddresses | StatusCard (x2) | Criar StatusCard; reutilizar getHealth / getNetworkAddresses |
| PairingCard | PairingSection | Portar layout (QR 200px, URL, Copiar, Renovar); manter getConnectionInfo, renewPairingToken |
| EventCard (takeout) | EventCard (redesign) | Alinhar props; manter onArchive/onDelete e Link para /events/$eventId |
| Tabela em events.$eventId | ParticipantsTable | Novo componente; manter getEventParticipants, postTakeoutConfirm, useTakeoutWs |
| — | EventSummary | Novo; totais + confirmados + pendentes + % |
| — | StatusBadge | Novo; confirmed \| pending \| duplicate \| failed |
| ImportPage (inline) | Layout import | Aplicar UI; manter fileInputRef, postImportJson, parsed state |
| AuditPage (inline) | AuditFilters + AuditLogTable | Novos componentes; manter getAudit, statusFilter, params |
| — | BreadcrumbNav | Opcional; usar em event detail |
| — | Collapsible | Adicionar shadcn Collapsible para seção "Arquivo" no dashboard |

---

## 3. Incompatibilidades e resolução

| Incompatibilidade | Resolução |
|-------------------|-----------|
| `next/link` | Usar `<Link>` de `@tanstack/react-router` com `to`, activeOptions para estilo ativo |
| `next/navigation` | Usar `useRouter()` do TanStack ou `useNavigate()` |
| `app/layout.tsx` | Equivalente: `src/routes/__root.tsx`; apenas atualizar Header e estilos globais |
| `app/page.tsx`, `app/events/[id]/page.tsx` | Não criar; manter routes atuais; trocar só conteúdo visual |
| `next/font` (Geist, Geist_Mono) | Carregar Geist via npm `geist` ou link e aplicar em index.css |
| Metadata/Viewport (Next) | Manter HeadContent em __root; viewport/themeColor opcional no index.html |
| Estrutura `app/` | Ignorar; nenhum arquivo em app/ no resultado final |

---

## 4. Estratégia de migração por etapas

1. **Fase 1 (infra)**: Tokens no `index.css`; Geist no CSS; `cn()` já existe; instalar Collapsible shadcn se faltar.
2. **Fase 2 (componentes)**: Portar Header, StatusCard, EventCard, PairingSection, EventSummary, StatusBadge, ParticipantsTable, AuditFilters, AuditLogTable, BreadcrumbNav; zero imports Next.
3. **Fase 3 (telas)**: Por rota: Dashboard, Event Details, Import, Audit; manter data-flow (React Query, takeout-api, useTakeoutWs).
4. **Fase 4**: Testes unitários/integração + e2e se houver; mocks para takeout-api onde necessário.
5. **Fase 5**: MIGRATION_REPORT.md, atualizar README, validar build + lint + test + tauri build.
