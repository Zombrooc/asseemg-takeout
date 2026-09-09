# ASSEEMG Retira — tarefas de segurança, performance e operação

Este documento é o plano de execução para endurecer e validar o aplicativo Electron em `apps/desktop`.

## Escopo e modelo de ameaça

- O Desktop é a fonte de verdade e expõe a API em `0.0.0.0:5555` para clientes móveis na LAN.
- O renderer desktop deve acessar apenas a API local.
- O cliente móvel deve acessar somente os endpoints necessários após pareamento.
- Um dispositivo não confiável na mesma rede deve ser considerado atacante.
- O tráfego HTTP puro é uma restrição atual da operação offline/LAN; ele não protege tokens contra um atacante que consiga observar o tráfego. Se a LAN não for confiável, será necessário TLS ou isolamento de rede.
- PII de participantes, operações de retirada e comandos administrativos são dados/ações protegidos.

## Estado inicial verificado

Após `pnpm install`, o estado atual atende aos gates básicos:

```text
pnpm typecheck  PASS
pnpm test       PASS — 2 arquivos / 3 testes
pnpm build      PASS
pnpm lint       PASS
```

Esses comandos são critérios de regressão obrigatórios para todas as tarefas abaixo.

## Ordem de execução

1. SEC-001, SEC-002 e SEC-003: fechar autenticação da API, WebSocket e IPC.
2. SEC-004 e SEC-005: restringir conteúdo/navegação e endurecer o pareamento.
3. SEC-006: limitar abuso de recursos e validar entradas.
4. PERF-001, PERF-002 e PERF-003: remover gargalos de banco, importação e renderer.
5. PERF-004: medir startup, CPU, memória e latência antes de otimizações adicionais.
6. REL-001 e SUPPLY-001: proteger distribuição e dependências.
7. QA-001: executar a matriz final de regressão e segurança.

---

## SEC-001 — Autenticação e autorização da API HTTP `[P0]`

### Problema

O servidor escuta em todas as interfaces, mas a maioria das rotas não exige `Authorization`. `getIdentity()` apenas identifica o operador quando encontra um token válido e usa `device_id` informado pelo cliente como fallback. Isso permite que qualquer host da LAN leia PII e execute importação, confirmação, desfazimento, exclusão, reset e alterações administrativas.

### Implementação

- Criar middleware de autenticação no servidor.
- Permitir sem token somente o conjunto mínimo explicitamente definido:
  - `GET /health`;
  - `GET /network/addresses`, se realmente necessário;
  - `POST /pair`, usando token de pareamento válido.
- Exigir Bearer token para participantes, eventos, auditoria, locks, importações, check-ins e rotas administrativas.
- Rejeitar token ausente, inválido, expirado ou revogado com `401`.
- Separar autorização por capacidade:
  - leitura de operação;
  - confirmação/desfazimento;
  - importação/administração.
- Nunca aceitar `device_id`, `operator_alias` ou identidade do corpo da requisição como identidade autenticada.
- Comparar tokens de forma segura e armazenar somente hash do access token no SQLite, se compatível com o fluxo de revogação.
- Não registrar tokens em logs, respostas de erro ou auditoria.

### Critérios de aprovação

- Toda rota protegida retorna `401` sem token.
- Token inválido nunca é tratado como identidade anônima.
- Um token válido acessa somente as capacidades autorizadas para o dispositivo.
- Um dispositivo não pode alterar a identidade de outro enviando outro `device_id` no payload.
- Testes cobrem todos os grupos de rotas, incluindo rotas legadas e `/locks`.

### Testes obrigatórios

- Teste de contrato: cada endpoint protegido sem `Authorization` retorna `401`.
- Teste de contrato: token inválido/expirado retorna `401`.
- Teste de autorização: operador somente leitura não pode importar, apagar evento ou resetar check-ins.
- Teste de spoofing: `device_id` do payload diferente do token não altera o `device_id` persistido.
- Teste de não regressão: `/health` continua acessível sem autenticação.

---

## SEC-002 — Autenticação e limites do WebSocket `[P0]`

### Problema

O upgrade de `/ws` aceita qualquer conexão, qualquer `event_id` e qualquer `last_seq`. Isso permite observar eventos de auditoria, consumir conexões e provocar replay de dados sem autenticação.

### Implementação

- Exigir Bearer token durante o handshake, preferencialmente em header; não colocar access token em query string.
- Validar token e autorização do evento antes de `handleUpgrade`.
- Validar `event_id` contra eventos existentes e contra a autorização do dispositivo.
- Configurar limite de payload, limite de conexões por dispositivo/IP e timeout de handshake.
- Fechar conexões em logout/revogação do dispositivo.
- Garantir limpeza de heartbeat, listeners e sockets no encerramento do servidor.

### Critérios de aprovação

- Upgrade sem token ou com token inválido é recusado.
- Um dispositivo não recebe eventos de outro evento sem autorização.
- Replay não aceita `last_seq` inválido, negativo ou ilimitado.
- Limites de conexão e payload são testados.

### Testes obrigatórios

- Handshake sem token, token inválido e token revogado.
- Handshake válido no evento autorizado.
- Tentativa de assinar evento não autorizado.
- Replay com `last_seq` válido, negativo e excessivamente grande.
- Encerramento do servidor com clientes conectados sem deixar timers ativos.

---

## SEC-003 — Endurecimento do processo principal e IPC `[P0]`

### Problema

Os handlers IPC não validam `event.sender`/`senderFrame`. Se o renderer navegar ou for comprometido, poderá invocar controles de janela e a rotina elevada do firewall.

### Implementação

- Criar `isTrustedRenderer(event.senderFrame)` com allowlist de origem/protocolo e referência à janela principal.
- Aplicar a validação a todos os `ipcMain.handle`.
- Rejeitar IPC de iframes, janelas filhas e renderers destruídos.
- Manter a bridge explícita e mínima; não expor `ipcRenderer`, eventos genéricos, `send`, `on` ou APIs Electron inteiras.
- Validar argumentos no main process mesmo que o TypeScript do renderer já os restrinja.
- Manter `contextIsolation`, `nodeIntegration: false` e `sandbox: true` explicitamente habilitados.

### Critérios de aprovação

- IPC vindo de origem não permitida retorna erro controlado e não executa ação.
- O renderer legítimo continua usando os seis métodos necessários.
- Nenhum handler privilegiado depende de dados de identidade enviados pelo renderer.

### Testes obrigatórios

- Teste unitário de `isTrustedRenderer` para origem válida, origem inválida, iframe e frame nulo.
- Teste dos handlers com sender inválido.
- Teste de que `firewall:allow` não executa para sender não confiável.
- Teste estático que proíbe exposição de `ipcRenderer` bruto no preload.

---

## SEC-004 — Conteúdo, navegação, protocolo e CSP `[P0]`

### Problema

O ambiente de desenvolvimento pode definir `ELECTRON_RENDERER_URL` sem validação. Não há bloqueio explícito de `will-navigate` nem `setWindowOpenHandler`. A produção carrega a UI com `file://`, que tem privilégios mais amplos.

### Implementação

- Aceitar `ELECTRON_RENDERER_URL` somente quando `!app.isPackaged` e somente para hosts/portas locais allowlisted.
- Em produção, registrar protocolo customizado, por exemplo `app://renderer`, servindo apenas arquivos empacotados.
- Bloquear navegação para qualquer origem diferente da origem oficial da aplicação.
- Negar criação de novas janelas por padrão; abrir links externos somente por allowlist explícita e `shell.openExternal` seguro.
- Não habilitar `webSecurity: false`, `allowRunningInsecureContent`, `experimentalFeatures` ou `enableBlinkFeatures`.
- Migrar CSP de meta tag para header do protocolo customizado quando possível.
- Remover `unsafe-inline` de `style-src` após confirmar que a UI não depende dele.

### Critérios de aprovação

- Build empacotado nunca carrega URL controlada por ambiente.
- Navegação externa e `window.open` são bloqueados ou tratados por allowlist.
- CSP não permite scripts inline nem origens arbitrárias.
- O renderer carregado em produção usa o protocolo customizado.

### Testes obrigatórios

- Teste de URL de desenvolvimento válida e inválida.
- Teste de navegação para origem oficial, origem externa e URL malformada.
- Teste de criação de janela com `window.open`.
- Teste de CSP em build empacotado.
- Teste de que não existem flags inseguras nas configurações de `BrowserWindow`.

---

## SEC-005 — Pareamento, tokens e transporte `[P0]`

### Problema

`/pair/info` expõe o token atual, `/pair/renew` pode ser chamado por qualquer host, o token curto é reutilizável e o transporte HTTP permite observação na LAN.

### Implementação

- Tornar o token de pareamento criptograficamente aleatório, com entropia suficiente, expiração curta e uso único.
- Invalidar o token após pareamento bem-sucedido ou exigir renovação explícita pelo operador.
- Revogar tokens antigos ao renovar.
- Aplicar rate limit e lockout progressivo a tentativas de pareamento.
- Restringir `/pair/renew` à UI desktop autenticada por IPC/local channel.
- Documentar claramente que HTTP só é aceitável em LAN confiável.
- Definir uma opção TLS para ambientes com LAN não confiável, sem quebrar o modo offline padrão.

### Critérios de aprovação

- Token não pode ser reutilizado após o uso definido.
- Tentativas excessivas são limitadas e auditadas sem registrar o segredo.
- Renovação não pode ser acionada remotamente por um cliente não autenticado.
- O QR continua funcionando no cliente mobile autorizado.

### Testes obrigatórios

- Entropia/formato e expiração do token.
- Reuso de token após pareamento.
- Renovação concorrente e invalidação do token anterior.
- Rate limit de tentativas inválidas.
- Pareamento válido pelo fluxo mobile existente.

---

## SEC-006 — Limites de entrada, abuso e operação `[P1]`

### Implementação

- Adicionar validação de schema para body, query, path e arquivos.
- Impor limites de tamanho de strings, arrays, participantes, linhas CSV e JSON aninhado.
- Substituir `multer.memoryStorage()` por fluxo controlado em arquivo temporário ou limitar concorrência explicitamente.
- Adicionar request timeout, rate limit e limite de conexões.
- Validar datas, IDs, modo de busca, status e números de reserva.
- Retornar mensagens de erro sem stack trace, caminhos locais ou dados sensíveis.
- Rever a regra de firewall para validar nome, programa, porta e perfil; não considerar apenas o nome da regra.

### Critérios de aprovação

- Entrada acima do limite retorna `413` ou `422` sem bloquear o processo principal.
- Payload inválido não altera o banco.
- Cinco uploads concorrentes no limite configurado não causam crescimento de memória não controlado.
- Erros de produção não expõem detalhes internos.

### Testes obrigatórios

- JSON acima do limite.
- CSV acima do limite, CSV malformado e linha excessivamente grande.
- Arrays de participantes acima do limite.
- Path/query/body inválidos.
- Timeout e rate limit.

---

## PERF-001 — Tirar trabalho pesado do processo principal `[P1]`

### Problema

`better-sqlite3`, importação CSV/JSON, parsing e consultas síncronas executam no processo principal do Electron. Em bases grandes isso bloqueia a UI e o servidor LAN.

### Implementação

- Medir primeiro startup, latência de IPC, tempo de importação e bloqueios do main process.
- Mover importação e parsing pesado para `utilityProcess`, worker thread ou processo dedicado.
- Encapsular acesso SQLite em uma camada única e definir operações assíncronas para o main/UI.
- Evitar `db.prepare().all()` sem limite em endpoints de operação.
- Não usar IPC síncrono.

### Critérios de aprovação

- A janela aparece e aceita interação enquanto uma importação grande executa.
- Nenhuma operação individual de importação mantém o main process bloqueado além do orçamento definido.
- A API continua responsiva durante importação e auditoria.

### Testes obrigatórios

- Importação com 10.000 participantes medindo tempo e latência da janela.
- Concorrência entre importação, busca e confirmação.
- Teste de cancelamento/erro sem deixar transação aberta.
- Perfil CPU do main process antes e depois.

---

## PERF-002 — Consultas, paginação e índices `[P1]`

### Implementação

- Paginar participantes, auditoria, eventos e replay WebSocket.
- Mover busca para SQL parametrizado com limites; evitar carregar todos os participantes e filtrar em JavaScript.
- Adicionar índices conforme `EXPLAIN QUERY PLAN`, especialmente para `takeout_events`, `check_ins`, `event_log`, `participants` e filtros de status/evento.
- Evitar N+1 queries em mapeamento de participantes legados.
- Definir limite máximo de resultados por endpoint.

### Critérios de aprovação

- Nenhum endpoint de listagem retorna quantidade ilimitada.
- Busca por CPF, ticket, QR e nome preserva os resultados funcionais atuais.
- Latência p95 da busca com 10.000 participantes fica abaixo de 200 ms na máquina de referência.
- Memória do renderer não cresce proporcionalmente ao total histórico quando apenas uma página é exibida.

### Testes obrigatórios

- Paginação, cursor/offset e ordenação estável.
- Busca de cada modo suportado.
- Limite máximo e parâmetros inválidos.
- Benchmark de busca com fixture de 10.000 participantes.
- Verificação de plano de consulta para as queries críticas.

---

## PERF-003 — Renderer responsivo e WebSocket eficiente `[P1]`

### Implementação

- Virtualizar tabelas grandes ou limitar a quantidade renderizada.
- Debounce da busca local/remota.
- Remover WebSocket quando a tela não precisa de atualização em tempo real.
- Quando usado, atualizar somente linhas afetadas, em vez de refazer listas completas.
- Cancelar fetches anteriores com `AbortController` ao trocar de tela ou filtro.
- Corrigir dependências de hooks sem provocar fetches duplicados.

### Critérios de aprovação

- Busca e scroll permanecem responsivos com 10.000 participantes.
- Nenhuma conexão WebSocket permanece após sair da tela/evento.
- Não há long task de renderer acima de 50 ms durante busca e confirmação na máquina de referência.

### Testes obrigatórios

- Teste de cleanup de WebSocket e timers.
- Teste de cancelamento de request.
- Teste de busca com dataset grande.
- Profiling Chrome Performance e Memory com evidência anexada ao PR.

---

## PERF-004 — Observabilidade e orçamento de performance `[P1]`

### Implementação

- Instrumentar: início do processo, `ready`, `ready-to-show`, primeira UI interativa, startup do servidor, importação, busca, confirmação e shutdown.
- Medir CPU/memória por processo e latência p50/p95.
- Registrar apenas métricas e IDs não sensíveis.
- Criar cenário reproduzível em máquina Windows suportada.

### Critérios de aprovação

- Cada release tem comparação com a baseline anterior.
- Orçamentos iniciais:
  - UI pronta para interação em até 3 s p95 em máquina de referência;
  - busca p95 abaixo de 200 ms com 10.000 participantes;
  - confirmação p95 abaixo de 500 ms localmente;
  - nenhum crescimento de memória após 100 ciclos de abrir/fechar evento.
- Qualquer violação gera tarefa de investigação, não apenas aumento silencioso do timeout.

### Testes obrigatórios

- Smoke de cold start.
- Teste de 100 ciclos de navegação.
- Teste de carga de importação e busca.
- Snapshot de CPU, RSS, heap e long tasks.

---

## REL-001 — Distribuição segura, Fuses e atualização `[P1]`

### Implementação

- Avaliar e aplicar Fuses apropriados, incluindo desativação de `runAsNode` e `nodeCliInspect` quando compatível.
- Configurar assinatura Authenticode do instalador e validar assinatura no pipeline.
- Definir política de atualização: canal, origem, verificação de assinatura, rollback e suporte offline.
- Fixar versão efetiva no lockfile e monitorar releases/CVEs do Electron, Chromium, Node e dependências nativas.
- Testar o instalador NSIS em máquina limpa e sem privilégios elevados permanentes.

### Critérios de aprovação

- Artefato de release é assinado e a assinatura é verificada automaticamente.
- Atualização não instala artefato sem assinatura válida.
- O app inicia com os Fuses esperados; o pipeline falha se forem alterados.
- Existe procedimento documentado para atualizar uma instalação offline.

### Testes obrigatórios

- Verificação de assinatura do instalador.
- Teste de artefato adulterado/rejeitado.
- Teste de instalação, atualização e rollback.
- Teste de execução sem permissões administrativas após instalação.
- Scan de dependências de produção.

---

## SUPPLY-001 — Auditoria de dependências `[P1]`

### Implementação

- Corrigir o comando/política de `pnpm audit` no workspace.
- Executar scan de dependências de produção e revisar vulnerabilidades transitivas.
- Fixar versões críticas e revisar dependências com acesso a filesystem, shell, upload e rede.
- Manter lockfile revisado em PR separado de atualizações funcionais.

### Critérios de aprovação

- O pipeline executa auditoria reproduzível sem erro de configuração.
- Nenhuma vulnerabilidade crítica/alta sem exceção documentada, prazo e mitigação.
- Dependências nativas (`better-sqlite3`) são reconstruídas para a versão correta do Electron.

### Testes obrigatórios

- Scan de produção no CI.
- Build limpo a partir do lockfile.
- Smoke test do módulo nativo no artefato empacotado.

---

## QA-001 — Suite final de regressão `[P0]`

### Testes obrigatórios antes de marcar o plano como concluído

```bash
cd apps/desktop
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Além dos gates acima:

- testes HTTP de autenticação e autorização;
- testes WebSocket de autenticação, isolamento e cleanup;
- testes IPC de sender/origem;
- testes de navegação/CSP/protocolo;
- testes de limites de payload, upload, timeout e rate limit;
- testes de idempotência, conflito, undo e auditoria;
- smoke test do instalador Windows em ambiente limpo;
- evidência de profiling de startup, memória e latência.

### Definição de pronto

Uma tarefa só pode ser marcada como concluída quando:

1. o código está implementado sem ignorar regras de segurança;
2. os testes de aceitação passam;
3. os gates completos passam;
4. não há segredo ou PII em logs/fixtures indevidos;
5. o comportamento está documentado;
6. o PR contém evidência suficiente para reproduzir a verificação;
7. qualquer exceção possui justificativa, risco residual, proprietário e data de revisão.

