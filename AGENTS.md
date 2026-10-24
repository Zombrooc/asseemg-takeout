# Instruções do repositório — ASSEEMG Retira

Estas instruções são a fonte operacional para agentes e IAs. O sistema está funcional; mudanças devem preservar os fluxos descritos aqui e ser acompanhadas por validação proporcional ao risco.

## Modelo atual e limites de escopo

- `apps/desktop` é o aplicativo desktop atual e a autoridade operacional. Não implementar novas telas, exportações, operações ou regras de negócio desktop em `apps/web`.
- `apps/web` e `apps/web/src-tauri` são legado/referência histórica. Só modificar esses diretórios quando o usuário pedir explicitamente uma tarefa de legado.
- `apps/native` é o cliente Expo/React Native que pareia com o desktop pela LAN.
- `packages/api` contém contratos compartilhados de HTTP/WebSocket; alterações de contrato devem ser refletidas no desktop, native e testes.
- `apps/server` é um stub técnico e não hospeda a API takeout.
- Documentação e arquivos agenticos podem ser atualizados em qualquer diretório; alterações de código de produto continuam sujeitas aos limites acima.

## Arquitetura autoritativa

- O processo Electron abre `takeout.db` em `app.getPath("userData")`, inicializa/migra SQLite e sobe a API na porta `5555`, bind `0.0.0.0`.
- O desktop é a única fonte de verdade para eventos, participantes, tickets, check-ins, auditoria, locks e log de eventos.
- O servidor é Express + `ws` em `apps/desktop/src/main/server.ts`; o renderer usa HTTP/WebSocket local.
- O mobile usa HTTP e um único WebSocket autenticado por dispositivo. Seus dados locais são cache/projeção e outbox, nunca autoridade.
- `/sync/pull` e `/sync/push` estão deliberadamente desativados no modo atual e retornam `503`. Não criar dependência de internet sem decisão explícita.

## Consistência, locks e realtime

- Check-in leva `request_id`/`operationId` estável (UUID). Repetição da mesma operação retorna `DUPLICATE`; nunca gerar outro ID após timeout.
- A autoridade grava check-in e evento realtime na mesma transação SQLite; o broadcast ocorre depois do commit.
- Um ticket JSON só pode ter um check-in confirmado; um participante legado só pode ter um por evento. Concorrência resulta em `CONFLICT`.
- O mobile grava operação + projeção `pending` em uma transação local antes de fechar a confirmação. Só marca `authoritative` após `ack`.
- Outbox: `pending`, `sending`, `acknowledged`, `conflict`, `failed`; timeout é resultado desconhecido e reutiliza a mesma operação.
- Locks são coordenação de UI, não garantia de unicidade. Um lock por participante dura 30 s e só o dono pode renovar.
- WebSocket: `connection.hello` → `connection.ready` → `sync.subscribe`; eventos persistem em `event_log` e o mobile retoma por `serverInstanceId + lastSeq`.

## Performance e dados

- SQLite usa WAL e `foreign_keys=ON`; preservar transações, queries parametrizadas e índices.
- Não logar tokens, CPF, payloads completos ou PII. Preservar projeções por entidade, workers de import/export e o coordenador único de writes do SQLite mobile.
- Não alterar normalização, chaves, status ou contratos sem atualizar migrações, testes e documentação.

## Processo obrigatório

1. Ler `docs/system-current-state.md`, `docs/local-first-sync.md` e `.cursor/rules/takeout-offline.mdc`.
2. Confirmar o caminho atual em `apps/desktop`/`apps/native`; não copiar implementação de `apps/web`.
3. Bug exige teste de regressão; feature exige cobertura do fluxo principal e, quando aplicável, offline/conflito.
4. Rodar os gates do escopo: `pnpm --dir apps/desktop typecheck`, `lint`, `test`; para native, `pnpm --dir apps/native test`; para contratos, `pnpm typecheck`.
5. Atualizar documentação ao alterar fluxo, contrato, persistência, lock, migração ou operação.

## Referências

- Estado atual: `docs/system-current-state.md`
- Dados e realtime: `docs/data-and-realtime.md`
- Sincronização: `docs/local-first-sync.md`
- Runbook: `docs/runbook.md`
- Regras agenticas: `.cursor/rules/takeout-offline.mdc` e `.cursor/rules/testing-regression.mdc`
