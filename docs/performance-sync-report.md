# Relatório de performance e sincronização

Baseline inspecionado: branch `master`, commit `6850f24ab0c937303398e8782893a3ea3e0008fa`. O workspace estava limpo antes desta implementação. O código Tauri legado em `apps/web` e `apps/web/src-tauri` não foi alterado.

## Hipóteses auditadas

| Hipótese | Classificação no baseline | Evidência e resultado |
| --- | --- | --- |
| H1 | Confirmada | A tela entregava objetos completos e `extraData` global ao `FlatList`. Agora a FlashList recebe chaves estáveis e cada célula assina uma entidade. |
| H2 | Confirmada | Locks expiravam por varredura periódica e podiam publicar mapas equivalentes. Agora cada entidade agenda somente sua próxima expiração e uma renovação do mesmo dono não notifica o card. |
| H3 | Confirmada | Patches produtivos percorriam `participants.map()`. O caminho quente agora localiza a entidade em `Map`; helpers antigos permanecem somente para compatibilidade/testes. |
| H4 | Confirmada | O índice dependia do array completo. Check-in, ACK e lock não o reconstroem; edições atualizam somente a entrada pesquisável afetada. |
| H5 | Confirmada | O scanner usava busca linear. Agora consulta o índice normalizado de QR/ingresso. |
| H6 | Parcialmente confirmada | Confirmação e contadores derivavam de estruturas globais. O store agora mantém contadores incrementais e assinaturas separadas; o snapshot HTTP inicial continua sendo global por definição. |
| H7 | Confirmada | A outbox enviava por HTTP. Agora tenta `command.execute` no socket autenticado e conserva HTTP como fallback com o mesmo `operationId`. |
| H8 | Confirmada | Um retorno depois de `markSending()` podia manter o flag do worker. Todo ciclo está protegido por `try/finally`. |
| H9 | Confirmada | Retry dependia de outro evento. O próximo `next_retry_at`/lease instala um despertador durável. |
| H10 | Confirmada | `sending` podia sobreviver sem recuperação. Uma lease de 30 s é recuperada na inicialização, reconexão e retomada do app. |
| H11 | Confirmada | A projeção antiga não escopava completamente a identidade. A chave passou a ser `(event_id, source_type, entity_id)`; JSON usa ingresso e legado usa participante. |
| H12 | Confirmada | Cursor/replay existiam, mas não atualizavam a projeção local atomicamente. Evento e cursor agora compartilham a transação e respeitam `serverInstanceId`. |
| H13 | Confirmada | O comando WS não cobria todo o legado. HTTP e WS chamam o mesmo serviço autoritativo para os dois tipos de origem. |
| H14 | Confirmada | O modal guardava o objeto selecionado. Agora guarda a chave da entidade e observa o snapshot atual. |

## Arquitetura entregue

- SQLite mobile: outbox, projeção provisória, participantes, metadados do evento e cursor durável.
- Store: snapshots por entidade com `useSyncExternalStore`, lista de IDs separada, índices exatos/textuais e contadores incrementais.
- Transporte: um `TakeoutSyncManager` autenticado por dispositivo, ACK/rejeição correlacionados, reconexão, replay e fallback HTTP idempotente.
- Autoridade: serviços transacionais compartilhados por HTTP e WS, validação de reuso incompatível do `operationId`, auditoria e broadcast depois do commit.
- UI: FlashList v2, cards por entidade, modal reativo, estados locais/`sending`/autoritativos/conflito visualmente distintos e QR indexado.

Principais arquivos alterados/criados:

- Mobile: `app/(drawer)/events/[eventId].tsx`, `participant-store.ts`, `takeout-sync-manager.ts`, `takeout-realtime.ts`, `takeout-identity.ts`, `takeout-metrics.ts`, `storage/participant-repository.ts`, `storage/takeout-database.ts`, `storage/takeout-outbox.ts`, `queue-processor.tsx`, modal, card e indicadores.
- Desktop: `src/main/server.ts`, `src/main/db.ts` e `tests/sync-command.test.ts`.
- Compartilhado: `packages/api/src/takeout-contracts.ts`.
- Testes: suites de store, repositório, outbox, identidade, gerenciador WS, benchmark e regressões da tela/card/modal.
- Dependências: FlashList 2.0.2 e Expo Crypto compatíveis com o SDK 57, com lockfile atualizado.

## Medições reproduzíveis

Benchmark Jest em Windows/Node, não em aparelho:

| Registros | Snapshot | Busca exata | Check-in isolado |
| ---: | ---: | ---: | ---: |
| 500 | 7,46 ms | 0,045 ms | 0,252 ms |
| 1.000 | 6,98 ms | 0,009 ms | 0,037 ms |
| 5.000 | 45,80 ms | 0,014 ms | 0,033 ms |
| 10.000 | 55,80 ms | 0,031 ms | 0,058 ms |
| 20.000 | 117,72 ms | 0,012 ms | 0,027 ms |

O teste também verifica que o check-in conserva a mesma referência do array de IDs e notifica somente a entidade alterada. Métricas agregadas de desenvolvimento foram adicionadas para snapshot, busca, commit local, envio, ACK, eventos, renders, atualizações da lista, tamanho da outbox, retries, conflitos e reconexões. Elas não incluem CPF, token ou payload de participante.

## Validação e limitações

- `pnpm --filter native test --runInBand`: 31 arquivos, 137 testes aprovados, incluindo a serialização das escritas SQLite concorrentes.
- `pnpm --dir apps/desktop test`: 14 arquivos, 45 testes aprovados.
- Typecheck do desktop e de `@pickup/api`: aprovados.
- Build Electron e `expo export --platform android`: aprovados. O Metro emitiu apenas o aviso conhecido de fallback para um caminho ausente nos `exports` do pacote React Native 0.86.3.
- Biome direcionado a todos os arquivos alterados: aprovado. `git diff --check`: aprovado.
- Testado: store granular, isolamento, locks, identidade multi-ingresso, outbox/lease/backoff/ACK, persistência incremental, troca de instância, sequência global não consecutiva, comandos WS legado, idempotência, testes e build Electron.
- Implementado, sem validação em dispositivo: migração Expo SQLite real, FlashList/scroll, suspensão e retomada do sistema operacional, latência entre aparelhos e consumo de memória.
- Não implementado: paginação do snapshot HTTP. O carregamento continua sendo um snapshot completo, protegido contra corrida com eventos WS por cursor; para volumes acima dos cenários medidos, paginação com marcador autoritativo ainda é recomendada.
- Limitação do ambiente: o typecheck nativo completo continua falhando por erros Tamagui/Uniwind e navegação preexistentes, fora deste fluxo. O lint completo do desktop também possui dívida preexistente em renderer/firewall. Os arquivos alterados são verificados separadamente.

## Validação de implantação

1. Fazer backup do SQLite autoritativo e instalar primeiro o desktop compatível.
2. Em aparelhos representativos, abrir eventos `json_sync` e `legacy_csv`, colocar o app offline, confirmar, encerrar o processo e validar o reenvio ao reabrir.
3. Repetir com dois mobiles no mesmo ingresso, perda de ACK, edição durante modal aberto e participante com dois ingressos.
4. Medir em build release 500/1k/5k/10k/20k: FPS de rolagem, memória, commit local, fechamento do modal, ACK e propagação.
5. Simular restauração do banco desktop e confirmar replay desde zero sem apagar a outbox mobile.
