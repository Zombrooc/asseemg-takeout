# Auditoria Técnica do Monorepo Takeout Offline

Data: 2026-02-24  
Escopo: Fase A (inventário + baseline + backlog incremental)

## Baseline executado

| Comando | Resultado antes | Resultado esperado após estabilização |
|---|---|---|
| `pnpm turbo run lint` | 0 tasks executadas (scripts ausentes) | Executar lint em apps/pacotes aplicáveis |
| `pnpm turbo run check-types` | OK parcial (web/server) | Mantido como alias para `typecheck` |
| `pnpm turbo run test` | Falhava: task `test` ausente no turbo | Executar testes em todos os workspaces com script |
| `pnpm turbo run build` | OK (warning de chunk circular web) | OK estável com monitoramento de warning |
| `pnpm --filter native run test` | OK | OK |
| `cargo test --manifest-path apps/web/src-tauri/Cargo.toml` | OK | OK |

## Top 20 problemas (por severidade)

| # | Severidade | Problema | Impacto | Causa raiz | Correção aplicada/proposta | Teste/validação |
|---|---|---|---|---|---|---|
| 1 | Alta | `turbo run test` inexistente | Gate quebrado | task ausente no `turbo.json` | adicionar task `test` + scripts por workspace | `pnpm turbo run test` |
| 2 | Alta | `lint` não roda no monorepo | qualidade sem gate | scripts ausentes | adicionar `lint` por app/pacote + task no turbo | `pnpm turbo run lint` |
| 3 | Alta | inconsistência `check-types` vs `typecheck` | DX confusa/CI frágil | naming legado parcial | padronizar `typecheck`, manter alias `check-types` | `pnpm turbo run typecheck` e alias |
| 4 | Alta | CI sem matriz Windows | risco de regressão cross-platform | pipeline only Ubuntu | matriz Ubuntu/Windows + split strict | workflow CI |
| 5 | Alta | contratos API duplicados web/native | drift de tipos | tipos mantidos em dois lugares | consolidar em `@pickup/api/takeout-contracts` | typecheck + testes |
| 6 | Alta | WS sem política explícita de reconnect/backoff no mobile | perda de atualização realtime | reconexão ausente | reconnect exponencial + timeout heartbeat | testes unitários de política |
| 7 | Alta | WS sem heartbeat servidor | conexões zumbis/stale | canal sem pulso | heartbeat em `/ws` no backend Rust | smoke realtime |
| 8 | Média | runtime Node sem pin | “works on my machine” | sem `.nvmrc`/Volta/asdf | adicionar `.nvmrc` (22) | `node -v` |
| 9 | Média | documentação fragmentada | onboarding lento | docs incompletas por app/pacote | READMEs por app/pacote + docs operacionais | revisão documental |
| 10 | Média | ausência de ADRs formais | decisões críticas sem histórico | processo informal | criar ADR template + ADRs iniciais | docs/adr |
| 11 | Média | regra de boundaries monorepo parcial | acoplamento entre apps/pacotes | policy incompleta | regra explícita de boundaries | docs/rules |
| 12 | Média | política “no node_modules edits” não explícita | risco de gambiarra | dependência de conhecimento tácito | criar rule formal | docs/rules |
| 13 | Média | runbook de incidentes ausente | MTTR alto | troubleshooting disperso | criar `docs/runbook.md` | revisão documental |
| 14 | Média | definição de style system dispersa | inconsistência visual | guideline não centralizada | rule de style system + doc RN | docs/rules + docs/react-native |
| 15 | Média | script web test ausente | pipeline test parcial | app sem task padronizada | script placeholder explícito + backlog | `pnpm turbo run test` |
| 16 | Baixa | `apps/server` pode confundir como API real | erro operacional | falta de doc local | README explicando stub | docs/readme |
| 17 | Baixa | warning de chunk circular no web build | potencial regressão perf | manualChunks agressivo | registrar em backlog de otimização | build log |
| 18 | Baixa | falta de templates operacionais | execução inconsistente | ausência de padrão | criar templates (feature/test/troubleshooting) | docs/templates |
| 19 | Baixa | rules/skills antigas sem numbering | dificuldade de descoberta | naming heterogêneo | adicionar versão numerada mantendo compat | docs/rules/skills |
| 20 | Baixa | ausência de README por pacote | ownership difusa | documentação só na raiz | adicionar READMEs em apps e packages | revisão documental |

## Hacks e customizações inventariadas

1. Patch formal em `patches/@expo__metro-runtime@6.1.2.patch` (mantido, documentado).
2. `apps/native/metro.config.js` com shim `react-native-shim.js` e resolver custom (manter até prova de remoção segura).
3. Harness anti-regressão Metro já existente (`scripts/test-harness/*`, invariantes em `apps/native/__tests__`).

## Backlog incremental com checkpoints verdes

1. Fase B: scripts/tasks/turbo/runtime -> checkpoint: lint/typecheck/test/build verdes.
2. Fase C: hardening RN/Metro + docs -> checkpoint: testes native + metro bundle check verdes.
3. Fase D/E: Tauri/Rust + contratos compartilhados + WS -> checkpoint: cargo test + typecheck verde.
4. Fase F: CI split strict -> checkpoint: workflow matrix verde.
5. Fase G: documentação/rules/skills/templates -> checkpoint: revisão final + comandos “How to run”.
