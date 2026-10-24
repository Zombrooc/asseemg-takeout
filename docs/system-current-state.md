# Estado atual do sistema

**Atualizado em:** 2026-10-24  
**Status:** operação funcional; este documento descreve o comportamento implementado, não um plano futuro.

## Resumo executivo

O ASSEEMG Retira é um sistema offline-first para retirada de kits em eventos de corrida. O desktop Electron é a autoridade local: mantém o SQLite, expõe HTTP/WebSocket na LAN e concentra a decisão final de check-in. O mobile pode continuar exibindo o último snapshot sem rede e registra intenções em uma outbox durável, mas nunca decide sozinho que uma retirada foi confirmada.

```text
Desktop Electron (apps/desktop)
  main process ── SQLite takeout.db (WAL, autoridade)
       ├── HTTP :5555 ── mobile(s) na LAN
       └── WebSocket /ws ── eventos, replay, locks e comandos

Mobile Expo (apps/native)
  SecureStore: URL/token/device
  SQLite local: snapshot + cursor + outbox + projeção
  UI/React Query: cache de visualização, não fonte de verdade
```

## Componentes e responsabilidades

| Componente | Responsabilidade | Não fazer |
| --- | --- | --- |
| `apps/desktop` | UI operacional, importação, exportação, API, SQLite, auditoria | Não delegar a decisão de check-in ao mobile |
| `apps/desktop/src/main/server.ts` | Express, WebSocket, pairing, eventos, locks e comandos | Não criar caminho alternativo sem idempotência |
| `apps/desktop/src/main/db.ts` | Schema, WAL, foreign keys, migrações compatíveis | Não trocar banco sem plano de migração |
| `apps/native` | Pareamento, busca, confirmação, snapshot offline e outbox | Não apagar operações pendentes |
| `packages/api` | Tipos e schema do protocolo HTTP/WS | Não divergir silenciosamente por app |
| `apps/server` | Stub técnico | Não colocar regras takeout aqui |

## Fluxos funcionais

### 1. Inicialização do desktop

1. Electron garante instância única.
2. Abre `%APPDATA%/.../takeout.db` via `app.getPath("userData")`.
3. Ativa `journal_mode=WAL` e `foreign_keys=ON`, move colisões de schemas legados quando necessário e aplica migrações aditivas.
4. Sobe HTTP em `0.0.0.0:5555`, descobre interfaces IPv4 e seleciona um endereço primário para o QR.
5. Cria a janela Electron com `contextIsolation`, `sandbox`, `nodeIntegration=false`, CSP, navegação restrita e IPC validado.

### 2. Pareamento

1. Desktop chama `GET /pair/info` e exibe `baseUrl`, token curto e validade de 15 minutos; `POST /pair/renew` gera outro token.
2. Mobile lê QR ou recebe URL/token manualmente.
3. Mobile chama `POST /pair` com `device_id`, `pairing_token` e `operator_alias`.
4. Desktop grava/atualiza o dispositivo e devolve `access_token` UUID.
5. Mobile guarda URL, token e device ID no SecureStore; chamadas autenticadas usam Bearer e o WebSocket envia credenciais somente em `connection.hello`.

O HTTP sem TLS é uma limitação assumida do modo LAN offline. Operar em rede confiável/isolada; não tratar o token como segredo protegido contra um observador da rede.

### 3. Importação e fontes de dados

- `json_sync`: `POST /sync/import` faz upsert de evento, participantes, tickets e custom forms em transação. A entidade de confirmação é o ticket.
- `legacy_csv`: `POST /admin/import/legacy-csv` valida e importa CSV, normaliza texto/CPF/data e cria participantes legados. A entidade de confirmação é o participante.
- `manual`: eventos criados pelo desktop, sem substituir as fontes acima.
- Após importação, o desktop emite `events_list_changed`. O mobile baixa o snapshot e o identifica por `eventId + sourceType + entityId`.

### 4. Check-in online e offline

1. Operador seleciona um participante/ticket e confirma no modal.
2. Mobile cria um UUID estável, grava a operação e a projeção `pending` numa transação SQLite local e atualiza a UI.
3. O worker envia por WebSocket quando operacional; HTTP é fallback.
4. Desktop autentica o dispositivo e executa o mesmo serviço para HTTP/WS:
   - mesmo `request_id` + mesmo alvo/payload → `DUPLICATE`;
   - alvo já confirmado por outra operação → `409 CONFLICT`;
   - alvo válido → insere check-in, auditoria e `event_log` atomicamente, retornando `CONFIRMED`.
5. `CONFIRMED`/`DUPLICATE` vira `acknowledged` e `authoritative`; conflito vira `conflict`; erro transitório volta a `pending` com backoff.

Undo grava `REVERSED` em nova operação e remove o check-in atual dentro de transação. Reset de check-ins é uma ação administrativa do desktop e deve ser tratado como destrutivo.

### 5. Realtime, replay e locks

- O servidor envia heartbeat a cada 30 s; o cliente considera a sessão indisponível após 90 s e reconecta com backoff de 1,5 s até 15 s.
- Ao assinar um evento, o servidor reproduz eventos após `lastSeq`, em lotes de até 250, envia locks ativos e termina com `sync.completed`.
- Eventos com sequência são aplicados no mobile junto com o avanço do cursor. Eventos antigos/duplicados da mesma instância são ignorados.
- Aquisição e renovação de lock usam TTL de 30 s. O lock indica intenção de edição/atendimento; a unicidade real é garantida pelo banco.

## Persistência e invariantes

### Desktop

Tabelas centrais: `events`, `participants`, `tickets`, `custom_forms`, `check_ins`, `takeout_events`, `legacy_participants`, `legacy_checkins`, `locks`, `event_log`, `paired_devices`, `pairing_tokens` e `authority_metadata`. `request_id` é único em cada família de operações; `ticket_id` é chave única em `check_ins`.

### Mobile

`sync_operations` é a outbox; `local_checkin_projection` representa o estado da operação; `participant_entities` guarda snapshots; `sync_cursors` garante retomada; `participant_event_metadata` preserva a fonte do evento. Todas as escritas passam pelo coordenador serializado e transações exclusivas, com WAL e `busy_timeout`.

### Regras que não podem ser quebradas

- Não considerar uma projeção `pending` como confirmação final.
- Não trocar `operationId` em retry.
- Não avançar cursor sem aplicar o evento na mesma transação.
- Não transmitir evento antes do commit da autoridade.
- Não usar lock como única defesa contra check-in duplicado.
- Não apagar histórico de auditoria para “limpar” a UI.
- Não misturar `json_sync` e `legacy_csv` na mesma chave de entidade.

## API operacional atual

Públicos para diagnóstico/pairing: `GET /health`, `GET /network/addresses`, `GET /pair/info`, `POST /pair`, `POST /pair/renew`. Operacionais: `/events`, `/events/:id/participants`, busca, CRUD de participante/evento, `/takeout/confirm`, `/takeout/undo`, `/takeout/confirm/legacy`, `/takeout/undo/legacy`, `/audit`, `/locks`, `/sync/import`, `/admin/import/legacy-csv`, `/sync/events`. Realtime: `GET /ws` via upgrade WebSocket.

`/sync/pull` e `/sync/push` permanecem placeholders offline e retornam `503`; não são uma integração funcional atual.

## Performance e operação

- Manter SQLite em WAL e evitar longas transações durante a operação de atendimento.
- Importações e exportações usam workers no renderer quando aplicável; não mover parsing pesado para o caminho de cada confirmação.
- Preservar índices de evento, CPF, ticket, participante, auditoria legada e `event_log`.
- No mobile, manter uma única fila de escrita; leituras podem continuar concorrentes sob WAL.
- Usar métricas de latência/contagem sem PII; nunca imprimir token, CPF ou payload completo.
- Antes de releases, executar os gates documentados no `AGENTS.md` e validar o fluxo pareamento → importação → busca → check-in → replay/offline → auditoria.

## O que está fora do escopo atual

- Sincronização com internet/thevent por `/sync/pull`/`push`.
- Transformar `apps/server` em backend takeout.
- Migrar o fluxo desktop de volta para Tauri/`apps/web`.
- Tratar o SQLite mobile como banco autoritativo ou remover a outbox por conveniência.
