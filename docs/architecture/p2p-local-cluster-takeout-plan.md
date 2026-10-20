# Plano de arquitetura: cluster local resiliente para retirada de kits

- **Status:** proposta para avaliação; nenhuma mudança de produto é aprovada por este documento.
- **Data:** 2026-10-20
- **Escopo:** `apps/desktop` (Electron) como nó coordenador e `apps/native` como app de staff. A rede continua estritamente local, por roteador ou hotspot, sem internet.
- **Decisão proposta:** substituir o único desktop obrigatório por um **cluster de três nós coordenadores**, com eleição de líder e confirmação por quórum. Os celulares continuam sendo réplicas de leitura e clientes de operação; não devem ser considerados servidores permanentes.

## 1. Resumo executivo

O problema atual não é a existência de uma API local; é haver apenas uma instância que decide e persiste toda retirada. Se o desktop que contém o SQLite ou sua API falhar, os staffs não conseguem concluir uma operação, embora estejam na mesma rede e tenham aparelhos funcionais.

O objetivo não deve ser “P2P” como sinônimo de sincronização eventual. Em retirada de kits, uma confirmação representa uma ação física irreversível. Dois aparelhos que confirmem o mesmo ticket em lados diferentes de uma rede partida não podem ser corrigidos posteriormente por uma regra de merge: o segundo kit já foi entregue.

Por isso, a proposta é uma rede local distribuída com uma única decisão lógica por vez, mas **sem máquina central permanente**. Três coordenadores mantêm uma cópia do mesmo log de decisões. Um deles é líder temporário; se ele cair, os outros elegem outro. Uma retirada é final apenas após a confirmação por pelo menos dois dos três nós. Isso remove o ponto único de falha e preserva a garantia de uma retirada por ticket.

Em uma frase: dados de leitura podem estar em todos os dispositivos; o direito de confirmar uma entrega é replicado e decidido por maioria.

## 2. Contexto e estado atual observado

Esta proposta parte da implementação Electron atual, não da implementação Tauri legada:

- `apps/desktop/src/main/index.ts` abre um único `takeout.db` no diretório de dados do Electron e inicia a API HTTP local.
- `apps/desktop/src/main/db.ts` usa SQLite em WAL e já impõe `check_ins.ticket_id` como chave primária e `check_ins.request_id` como único. Dentro de **um** banco, isso torna a confirmação atômica.
- `POST /takeout/confirm` em `apps/desktop/src/main/server.ts` consulta a retirada existente e, em uma transação SQLite, insere `check_ins` e o evento de auditoria `takeout_events`.
- O mesmo servidor já possui `event_log`, `GET /sync/events` por cursor e WebSocket para atualização de tela. Hoje isso é um stream de um produtor para clientes, e não uma replicação multiwriter entre bases.
- O `request_id` gerado pelo cliente já fornece uma base importante de idempotência: repetir a mesma intenção não pode causar nova retirada.
- Há inclusive uma migração defensiva para tabelas de uma experiência P2P anterior (`peer_*`). Isso é evidência para **não** reutilizar ou sobrescrever essas tabelas numa nova iniciativa; a nova estrutura deve ter nomes e versão de protocolo próprios.

A restrição existente `UNIQUE(ticket_id)` resolve concorrência apenas enquanto todos escrevem no mesmo SQLite. Copiar o arquivo, sincronizar WAL ou aceitar escrita em SQLite independente não estende essa garantia à rede.

## 3. Objetivos, não objetivos e invariantes

### 3.1 Objetivos

1. Eliminar a dependência de um desktop específico durante a operação.
2. Permanecer 100% offline da internet; o roteador/hotspot serve somente como transporte IP local.
3. Preservar a regra de negócio: um ticket só pode ter uma retirada confirmada ativa.
4. Permitir falha planejada ou acidental de um dos três coordenadores sem parar a operação.
5. Manter trilha de auditoria, autoria, horário, dispositivo e motivo de reversão.
6. Continuar oferecendo busca rápida mesmo que momentaneamente não exista quórum.
7. Evitar que uma mudança de arquitetura exija sincronizar arquivos SQLite ou altere histórico já coletado.

### 3.2 Não objetivos da primeira versão

- Comunicação entre eventos geograficamente separados ou via internet.
- Tolerância simultânea à perda de dois dos três coordenadores.
- Transformar cada celular comum em membro votante do cluster.
- Resolver automaticamente conflito de entrega física após duas redes isoladas terem operado sem coordenação.
- Substituir a integração de importação/exportação de participantes; ela será adaptada ao modelo novo em etapa posterior.

### 3.3 Invariantes que devem orientar toda decisão

| Invariante | Por que existe | Como será garantido |
| --- | --- | --- |
| Um ticket não possui duas retiradas ativas confirmadas. | Evita entrega duplicada. | O comando é ordenado no log consensual; a projeção rejeita uma segunda confirmação para o mesmo ticket. |
| Uma confirmação exibida como final é durável. | O staff não pode entregar baseado em estado que desaparece numa queda. | Só exibir `CONFIRMED` após persistência em quórum. |
| Reenviar a mesma intenção não muda o resultado. | Wi-Fi e apps móveis falham e repetem requisições. | `operation_id`/`request_id` globalmente único e deduplicado no log. |
| Histórico não é reescrito. | Auditoria, investigação e reconciliação precisam da sequência real. | Eventos imutáveis; undo/revogação são eventos posteriores que referenciam o original. |
| Todo estado deriva de dados verificáveis. | Réplicas precisam reconstruir a mesma visão após reinício. | Snapshot versionado + log ordenado e validado. |

## 4. Limite fundamental: consistência, disponibilidade e partições

Uma LAN pode se partir mesmo sem internet: um hotspot reinicia, um notebook muda de Wi-Fi, um access point congela ou dois grupos se afastam. Em uma partição, não existe protocolo que permita a ambos os grupos confirmar qualquer ticket e, ao mesmo tempo, garanta que nunca confirmarão o mesmo ticket. Essa é uma limitação física e de sistemas distribuídos, não uma escolha de biblioteca.

Há três políticas possíveis:

| Política | Durante uma partição | Resultado para retirada | Avaliação |
| --- | --- | --- | --- |
| Disponibilidade total / sincronização eventual | Cada lado continua confirmando. | Pode haver duas entregas; o conflito só aparece depois. | Inaceitável como padrão. |
| Consistência por quórum | Só o lado com maioria confirma. | Não há duplicidade; o lado sem maioria fica em espera. | **Recomendada.** |
| Posse pré-alocada | Cada lado confirma apenas tickets previamente reservados para ele. | Sem duplicidade, mas atendimento fica restrito ao lote/estação. | Modo de contingência complementar. |

Portanto, esta proposta escolhe consistência para a confirmação final. A interface deve dizer claramente “pendente de rede” em vez de sugerir que houve retirada quando o quórum não existe.

## 5. Alternativas avaliadas

### A. Manter um desktop central e acrescentar backup manual

**Prós:** menor custo, menor mudança de código e operação já conhecida.  
**Contras:** continua sendo ponto único de falha em tempo real; backup não aceita confirmações enquanto o primário está indisponível.  
**Quando faria sentido:** eventos pequenos em que uma interrupção de alguns minutos é aceitável.  
**Decisão:** não atende ao objetivo principal.

### B. Todos sincronizam seus SQLite/arquivos de banco

**Prós:** parece simples e mantém as consultas atuais.  
**Contras:** SQLite não é um banco multi-master por cópia de arquivo; WAL, migrações, índices e transações não têm merge semântico. Duas bases podem aceitar o mesmo ticket e não há forma segura de mesclar a ação física.  
**Decisão:** rejeitada.

### C. P2P eventual com CRDT, `last-write-wins` ou merge determinístico

**Prós:** alta disponibilidade e cada dispositivo pode escrever localmente.  
**Contras:** CRDT resolve convergência de dados, não exclusividade de uma ação física. Definir qual retirada “venceu” depois não recolhe um kit entregue. `last-write-wins` ainda depende de relógios e perde informação.  
**Decisão:** pode servir a notas, presença analítica ou telemetria; não para o comando de retirada.

### D. Locks distribuídos com TTL, sem consenso

**Prós:** implementação aparentemente menor e boa experiência enquanto a rede está saudável.  
**Contras:** relógios podem divergir, um lock pode expirar durante uma entrega, mensagens podem atrasar e dois nós podem acreditar que possuem o mesmo lock. Lock é uma otimização de UX, não uma autorização definitiva.  
**Decisão:** manter somente como sinalização visual opcional; nunca como garantia final.

### E. Reserva prévia de tickets por estação/staff

**Prós:** funciona em isolamento completo, com decisão local; evita duplicidade dentro dos lotes.  
**Contras:** reduz flexibilidade: um participante cujo ticket pertence à estação A não pode ser atendido livremente na B; transferência de lote também exige coordenação.  
**Decisão:** recomendado como plano de contingência para perda prolongada do quórum, não como fluxo padrão.

### F. Cluster local com consenso por maioria (proposta)

**Prós:** elimina máquina central fixa, mantém exclusividade, suporta falha de um coordenador e produz log auditável ordenado.  
**Contras:** precisa de três dispositivos estáveis, há implementação e operação mais complexas e, sem maioria, confirmações param.  
**Decisão:** recomendada para o valor e o risco do domínio.

## 6. Arquitetura alvo

### 6.1 Papéis

| Papel | Quantidade inicial | Responsabilidade | Requisito |
| --- | ---: | --- | --- |
| Administrador do evento | 1 ou mais | Cria o cluster, importa snapshot, cadastra coordenadores e emite credenciais. | Aplicativo desktop com permissão administrativa. |
| Coordenador votante | 3 | Armazena réplica do log, participa de eleição e confirma comandos por quórum. | Electron em notebook/mini-PC alimentado, rede estável, armazenamento local. |
| Staff mobile | Muitos | Busca participantes, envia comandos a qualquer coordenador e mantém cache/fila local. | App em primeiro plano e conexão de saída para a LAN. |
| Observador/relatório | Opcional | Consulta auditoria e indicadores sem direito de confirmação. | Credencial somente leitura. |

Três coordenadores é o menor conjunto que tolera a queda de um: quórum = 2. Dois coordenadores toleram queda de zero; se um cair, o outro não pode distinguir queda de partição e não deve confirmar sozinho. Cinco nós tolerariam duas falhas, mas aumentariam equipamento, rádio Wi-Fi, suporte e tempo de replicação sem necessidade comprovada.

### 6.2 Topologia lógica

```text
                 descoberta por QR / mDNS e lista assinada

        ┌──────────────────────────────────────────────────────┐
        │                    LAN sem internet                   │
        │                                                      │
        │  Coord. A  ◄──── log replicado / eleição ────► Coord. B│
        │      ▲  ╲                                      ╱  ▲   │
        │      │   ╲──────────── Coord. C ──────────────╱   │   │
        │      │                                             │   │
        │  mobile 1 ─── WebSocket/HTTP de saída ─── mobile N  │
        └──────────────────────────────────────────────────────┘
```

Todo staff pode conversar com qualquer coordenador saudável. O líder atual aceita o comando; um seguidor pode encaminhá-lo ou responder com o endereço do líder. Se o líder cair, os outros coordenadores elegem um novo líder e os clientes tentam a próxima URL conhecida. A interface não precisa expor essa mecânica ao operador, mas deve expor a saúde do cluster.

### 6.3 Por que celulares não serão votantes na primeira versão

Expo/React Native, sobretudo no iOS, não oferece um servidor de entrada confiável quando o aplicativo fica em segundo plano. Há limitações de energia, suspensão do processo, troca de rede e políticas de background. Tornar todo telefone votante aumentaria falsos timeouts e eleições sem acrescentar confiabilidade real.

Isso não torna o celular um cliente frágil: ele terá snapshot local para busca e uma fila durável para intenção de operação. A decisão final, contudo, é feita por equipamentos preparados para permanecer ligados e com o aplicativo aberto. Caso o produto precise de nós portáteis, deve ser avaliado um aplicativo nativo dedicado/foreground service para Android ou um tablet gerenciado; não se deve pressupor esse comportamento no Expo atual.

## 7. Modelo de dados distribuído

### 7.1 Separar fonte de fatos e projeções SQLite

Cada coordenador terá seu próprio SQLite. Ele não será copiado para os pares. O banco conterá duas categorias:

1. **Log consensual:** fatos ordenados e imutáveis, exatamente iguais em todos os coordenadores que alcançaram o mesmo índice.
2. **Projeções locais:** `check_ins`, `takeout_events`, busca de participantes, painéis e auditoria, reconstruíveis a partir de snapshot + log.

Esse desenho preserva a ergonomia e velocidade atual do SQLite sem delegar a ele uma coordenação que não pode executar entre máquinas.

### 7.2 Snapshot de evento

Antes da operação, o administrador cria um pacote de evento imutável contendo participantes, tickets, formulários, metadados do evento e uma versão de schema. O manifesto deve incluir:

```text
cluster_id           identificador aleatório da instância local
event_id             identificador de negócio do evento
snapshot_version     versão monotônica
schema_version       versão do formato de dados
content_hash         SHA-256 de cada arquivo e do conjunto
created_at           horário UTC informativo
created_by           identidade administrativa
signature            assinatura da chave administrativa
```

Os coordenadores só entram no cluster após validar assinatura, hashes, versões e `event_id`. Isso previne que um notebook de outro evento ou uma importação incompleta se misture silenciosamente à operação. O pacote pode ser disseminado pela LAN ou por mídia física no setup; a primeira operação só é habilitada depois que os três relatam o mesmo hash.

### 7.3 Formato conceitual de operação

O protocolo não deve persistir o JSON HTTP atual como única verdade. Ele precisa de um envelope explícito, versionado e verificável:

```json
{
  "protocolVersion": 1,
  "clusterId": "uuid",
  "eventId": "uuid",
  "operationId": "uuid",
  "requestId": "uuid-gerado-pelo-cliente",
  "kind": "TAKEOUT_CONFIRM",
  "ticketId": "ticket-123",
  "actor": {
    "deviceId": "staff-device-id",
    "operatorId": "operator-id",
    "role": "staff"
  },
  "observedAt": "2026-10-20T12:34:56.000Z",
  "payload": {},
  "signature": "..."
}
```

O líder adiciona metadados de consenso — termo, índice e hash do evento anterior — antes da replicação. `observedAt` é útil para auditoria, mas não deve decidir vencedores. A ordem definitiva vem do índice do log, não do relógio do celular.

Tipos mínimos iniciais:

| Evento | Efeito na projeção | Observação |
| --- | --- | --- |
| `TAKEOUT_CONFIRM` | Cria retirada ativa para um ticket sem retirada ativa. | Rejeita com conflito se já houver confirmação ativa. |
| `TAKEOUT_UNDO` | Revoga uma confirmação identificada. | Exige papel autorizado e referência ao `operationId` original. |
| `STAFF_GRANTED` / `STAFF_REVOKED` | Atualiza autorização local. | Administração também precisa de log e auditoria. |
| `TICKET_ASSIGNED` / `TICKET_UNASSIGNED` | Define lote de contingência. | Não entra no primeiro marco se não houver necessidade operacional. |
| `EVENT_SEALED` | Fecha novas operações após encerramento. | Permite exportação e reconciliação determinísticas. |

Uma operação inválida não deve ser incluída como confirmação silenciosa. A resposta precisa ser explícita: `CONFLICT`, `FORBIDDEN`, `INVALID_SNAPSHOT`, `NO_QUORUM` ou `DUPLICATE`, com o identificador da decisão existente quando aplicável.

### 7.4 Idempotência e concorrência

`request_id` continua sendo aceito para compatibilidade com o mobile, mas o protocolo adiciona `operation_id` como identificador universal da decisão. A regra será:

- Mesmo `operation_id` ou `request_id`, mesmo conteúdo: retornar a decisão já conhecida.
- Mesmo `request_id`, conteúdo diferente: erro de integridade/auditoria; nunca escolher silenciosamente um deles.
- Duas operações diferentes para o mesmo ticket: a que entrar primeiro no log confirmado cria a retirada; a segunda recebe `CONFLICT` e referencia a primeira.
- Reenvio após timeout: o cliente consulta o estado de `operation_id` antes de criar uma nova intenção.

## 8. Protocolo de consenso e fluxo de operação

### 8.1 Escolha do mecanismo

A implementação deve seguir um protocolo de consenso com líder, log ordenado, eleição e quórum — Raft é a referência mais apropriada por ser compreensível e bem estabelecida. A decisão de biblioteca/runtime deve ocorrer apenas após uma prova de conceito; não é prudente acrescentar uma dependência de consenso à aplicação de produção sem testes de falha.

Não é necessário implementar o algoritmo inteiro dentro da camada HTTP de rota. Criar uma abstração como `ClusterCommandService` separa o transporte (HTTP/WebSocket), o consenso e a projeção SQLite. Assim, a API atual pode preservar seus contratos enquanto troca a forma de obter a decisão.

### 8.2 Confirmação normal

1. Staff pesquisa no snapshot local ou consulta um coordenador e abre a ficha do participante.
2. Após a confirmação humana, o mobile grava a intenção em sua fila local antes de transmiti-la.
3. O mobile envia `TAKEOUT_CONFIRM` a qualquer coordenador conhecido, com token de staff e `operation_id`.
4. Se o destino for seguidor, ele encaminha ao líder ou devolve a lista de líderes conhecidos; o cliente tenta outro nó automaticamente.
5. O líder valida evento, autorização, schema, assinatura e estado conhecido do ticket.
6. O líder anexa a intenção ao seu log e a replica aos demais coordenadores.
7. Quando dois dos três nós persistiram a mesma entrada, o líder a marca como confirmada e a aplica à projeção SQLite local.
8. Os coordenadores aplicam a entrada na mesma ordem às próprias projeções.
9. O líder responde `CONFIRMED`, incluindo `operation_id`, índice do log e estado final. Só neste ponto a UI mostra entrega concluída e o staff entrega o kit.
10. Se a resposta se perder, o mobile retém a fila e consulta/reenvia o mesmo `operation_id`; a resposta será a mesma decisão.

### 8.3 Conflito de ticket já retirado

1. Duas filas enviam tickets idênticos quase simultaneamente.
2. O log ordena uma delas primeiro.
3. A primeira confirma por quórum.
4. Ao processar a segunda, a projeção identifica retirada ativa e produz `CONFLICT` com a referência da primeira.
5. A tela mostra data, operador e estação da retirada anterior conforme permissão, permitindo atendimento humano adequado.

### 8.4 Queda do líder

1. Coordenadores detectam a ausência do líder por timeout e iniciam eleição com um termo superior.
2. O nó que obtém a maioria se torna líder, preservando apenas entradas que a maioria reconhece como confirmadas.
3. Entradas que estavam apenas no líder perdido ou em minoria não são exibidas como retirada final; o cliente consulta e reenvia a mesma operação se necessário.
4. O novo líder anuncia sua disponibilidade. Clientes reconectam com backoff curto e aleatório para evitar sobrecarga.

Isso explica por que o passo 9 só ocorre após quórum: uma resposta antes desse ponto poderia prometer uma retirada que se perde junto com o antigo líder.

### 8.5 Perda de quórum

Com apenas um de três coordenadores acessível, busca e leitura do último estado confirmado continuam locais. Novas confirmações entram em estado `PENDING_NETWORK` e não autorizam entrega. A UI deve dar uma ação operacional clara: restaurar rede, ligar outro coordenador ou ativar o plano de lotes pré-reservados sob autorização de supervisor.

Não deve haver botão oculto de “forçar confirmação local” no fluxo normal. Se existir um modo de emergência, ele precisa de papel administrativo, justificativa obrigatória, tela visualmente distinta, marca de auditoria e reconciliação posterior. Mesmo assim, ele reintroduz o risco que a arquitetura procura evitar.

## 9. Sincronização, descoberta e conectividade

### 9.1 Descoberta segura

O QR de setup do evento deve conter `cluster_id`, `event_id`, fingerprint da chave do cluster e uma ou mais URLs iniciais de coordenadores. mDNS pode facilitar encontrar nós na mesma sub-rede, mas não pode ser a única fonte de confiança: broadcasts podem ser bloqueados por hotspots e um anúncio sem autenticação pode ser falsificado.

Após o primeiro contato autenticado, cada cliente mantém uma lista assinada de membros e suas URLs. O pareamento temporário atual pode evoluir para emitir credencial de staff associada a evento, dispositivo, papel e expiração. A renovação deve continuar exigindo presença/ação administrativa.

### 9.2 Transporte

- Coordenadores mantêm conexões autenticadas e persistentes entre si para replicação e heartbeats.
- Mobile faz conexões **de saída** HTTPS/WSS quando possível; HTTP/WSS na LAN pode ser mantido provisoriamente por compatibilidade, desde que a ameaça local seja aceita e documentada.
- HTTP de requisição/resposta atende comandos e recuperação; WebSocket entrega mudança de líder, status do cluster e atualização em tempo real.
- Todo endpoint de consenso separa tráfego de coordenador e tráfego de staff. Uma credencial de staff nunca pode votar, replicar ou alterar membros.

### 9.3 Segurança pragmática de LAN

Rede local não significa rede confiável. O plano mínimo é autenticação forte de dispositivo, autorização por papel, expiração/revogação e assinatura dos comandos administrativos. TLS com certificados locais melhora confidencialidade, mas introduz distribuição e confiança de certificado em dispositivos móveis; deve ser tratado como marco próprio, com teste em Android/iOS. Independentemente de TLS, a assinatura/autorização de operação continua necessária.

Não registrar token de acesso, chave privada, CPF completo ou payload sensível nos logs técnicos. Auditoria de negócio deve aplicar retenção e controles compatíveis com LGPD e com a política da organização.

## 10. UX e operação no dia do evento

### 10.1 Indicadores obrigatórios

O operador não precisa aprender Raft, mas precisa saber se pode entregar um kit. A interface deve sempre expor:

| Estado exibido | Significado | Ação de staff |
| --- | --- | --- |
| `Pronto — rede protegida (2/3 ou 3/3)` | Há quórum e a confirmação pode ser final. | Operar normalmente. |
| `Confirmando…` | A operação foi recebida, ainda não está durável. | Não entregar até resultado. |
| `Já retirado` | Existe confirmação ativa no log. | Acionar procedimento de exceção. |
| `Sem quórum — somente consulta` | Não há maioria de coordenadores. | Restaurar rede ou usar contingência autorizada. |
| `Dados do evento divergentes` | Snapshot/membro incompatível detectado. | Não operar; chamar supervisor. |

O botão de confirmar deve ficar bloqueado durante uma tentativa pendente para o mesmo ticket, mas a fila precisa sobreviver a fechamento e reinício do app. Erros técnicos devem informar um código para suporte sem expor segredos.

### 10.2 Checklist de abertura

1. Energizar e abrir os três coordenadores.
2. Conectar todos à mesma SSID/hotspot e verificar endereços IP alcançáveis.
3. Criar/selecionar o evento e importar o snapshot em um coordenador administrativo.
4. Replicar o snapshot aos outros dois e validar `event_id`, versão e hash idênticos.
5. Formar o cluster e verificar painel verde com 3/3 membros.
6. Criar pareamentos de staff por QR e validar uma busca sem confirmar retirada real.
7. Executar uma retirada de teste em ticket de teste e conferir que aparece na auditoria de todos os nós.
8. Registrar qual equipamento é A, B e C, responsável e fonte de energia.

### 10.3 Checklist de encerramento

1. Interromper novas confirmações com `EVENT_SEALED` ou modo de fechamento.
2. Confirmar que todos os coordenadores alcançaram o mesmo último índice/contagem de operações.
3. Exportar auditoria assinada e um bundle de backup por coordenador.
4. Registrar operações pendentes, conflitos e qualquer contingência usada.
5. Só então desligar os equipamentos.

## 11. Plano de implementação por etapas

Cada etapa tem critério de saída, testes e possibilidade de parada. Não se deve migrar uma operação real para a próxima fase enquanto o critério anterior não for atendido.

### Fase 0 — Decisão de produto e levantamento de capacidade

**Objetivo:** validar que a escolha por quórum é aceitável para operação e que há hardware para três coordenadores.

1. Medir número máximo de staffs, ritmo de retiradas por minuto, tamanho de importação e cobertura Wi-Fi dos locais típicos.
2. Definir SLA local: por exemplo, confirmação p95 abaixo de 1 segundo com 3/3 e abaixo de 2 segundos com 2/3; valores devem ser acordados, não assumidos.
3. Definir quem porta/energiza os três coordenadores e qual é o procedimento de rede/hotspot.
4. Decidir formalmente a política de perda de quórum e se lotes pré-reservados serão necessários.
5. Criar um ADR aceitando ou rejeitando esta proposta antes de implementação.

**Saída:** matriz de decisão assinada por produto/operação e inventário mínimo de hardware.  
**Risco se ignorada:** construir alta disponibilidade que a equipe não consegue operar no local.

### Fase 1 — Consolidar contratos e testes de semântica

**Objetivo:** tornar a regra de retirada independente do servidor único atual.

1. Mover/adaptar contratos de comando, resultado e realtime para `packages/api`, sem imports internos entre aplicativos.
2. Definir schemas validados (por exemplo, Zod) para envelopes, códigos de erro e versões de protocolo.
3. Extrair uma projeção determinística testável: dado snapshot + sequência de operações, produzir `check_ins` e auditoria.
4. Cobrir com testes os invariantes: duplicata por `request_id`, disputa por ticket, undo autorizado, evento de outro `event_id`, operação fora de ordem e reconstrução após reinício.
5. Manter os endpoints atuais como adaptadores temporários, preservando a operação single-node.

**Saída:** testes conseguem validar as regras sem iniciar HTTP ou compartilhar um SQLite.  
**Rollback:** não altera a topologia nem o formato já gravado de produção.

### Fase 2 — Log local e reconstrução sem consenso

**Objetivo:** provar o modelo event-sourced em um único desktop antes de distribuir.

1. Criar tabelas novas e versionadas, por exemplo `cluster_metadata`, `cluster_log`, `cluster_applied`, `snapshot_manifest`; não reutilizar `peer_*` nem alterar arquivos SQLite por cópia.
2. Aplicar cada comando em transação: persistir evento, aplicar projeção e registrar índice local.
3. Implementar recuperação: apagar somente a projeção de ambiente de teste, reconstruí-la do snapshot/log e comparar hashes/contagens.
4. Migrar dados existentes por um importador explícito e auditável, uma única vez, nunca por inferência de esquema.
5. Comparar auditoria e exportações do modo novo com o modo atual usando fixtures reais anonimizadas.

**Saída:** um nó reiniciado reproduz exatamente o mesmo estado confirmado.  
**Risco controlado:** ainda há um único escritor, portanto sem efeito de falha distribuída no evento.

### Fase 3 — Prova de conceito de cluster isolada

**Objetivo:** validar eleição, replicação, recuperação e quórum sem tocar no fluxo de produção.

1. Criar três processos Electron/Node de teste com diretórios de dados distintos em uma rede simulada ou portas locais distintas.
2. Implementar ou integrar uma camada de consenso atrás de interface; o transporte precisa permitir atraso, perda, duplicação e divisão de rede nos testes.
3. Testar eleição inicial, troca de líder, queda de líder durante escrita, reinício de seguidor, perda de quórum e reunião dos grupos.
4. Verificar por asserção que nenhum cenário confirma dois `TAKEOUT_CONFIRM` ativos para o mesmo ticket.
5. Medir latência e volume de disco/rede com o pico estimado da Fase 0.

**Saída:** testes automatizados de falha passam repetidamente e demonstram as garantias.  
**Decisão de gate:** se 2/3 não atingir o SLA, simplificar o requisito ou melhorar rede/hardware antes de avançar.

### Fase 4 — API, mobile e UX de saúde do cluster

**Objetivo:** conectar staffs sem expor a complexidade interna.

1. Adicionar endpoint de bootstrap/status com lista de membros, líder conhecido, quórum, versão de snapshot e índice aplicado.
2. Fazer o mobile armazenar várias URLs de coordenadores, não uma única `base_url` fixa.
3. Atualizar a fila local para persistir `operation_id`, resultado confirmado e tentativas; ela deve tentar o próximo coordenador com backoff.
4. Tratar os resultados `PENDING_NETWORK`, `NO_QUORUM` e `CONFLICT` como estados visíveis e distintos.
5. Instrumentar painel desktop para saúde, divergência de log, lag de seguidor e ações de recuperação.

**Saída:** desligar um coordenador em ambiente de homologação não interrompe retirada e o mobile se recupera sem novo pareamento.  
**Compatibilidade:** enquanto houver modo single-node, ele deve anunciar explicitamente que não tem tolerância a falha, em vez de simular 1/3 como seguro.

### Fase 5 — Piloto operacional controlado

**Objetivo:** validar pessoas, rede e software num cenário real de baixo risco.

1. Executar em evento interno, credenciamento de teste ou uma fila limitada, mantendo procedimento manual de contingência aprovado.
2. Simular desligamento do líder, perda de um seguidor, queda/reentrada de Wi-Fi de um mobile e reinício de hotspot.
3. Coletar métricas e relatos dos staffs: tempo de confirmação, clareza dos estados, falhas de pareamento e eventos pendentes.
4. Reconciliar os três logs e a auditoria final; investigar qualquer divergência, mesmo que autorreparada.
5. Fazer revisão pós-evento e só habilitar padrão cluster após aprovação explícita.

**Saída:** relatório de piloto, critérios de aceitação atendidos e runbook revisado.

### Fase 6 — Contingência por lotes (opcional, posterior)

**Objetivo:** permitir alguma continuidade sem quórum, assumindo trade-off de flexibilidade.

1. Supervisor aloca tickets/faixas de bib a estações no log antes da falha.
2. Cada estação recebe credencial capaz de confirmar somente seu lote enquanto isolada.
3. Ao reconciliar, cada confirmação carrega a versão da alocação; operações fora do lote aparecem como exceção, não são mescladas silenciosamente.
4. A UI deixa inequívoco que a estação está em modo contingência e mostra o lote restante.

**Saída:** teste de duas redes isoladas confirma que nenhuma delas pode retirar ticket da outra.  
**Trade-off:** fila deixa de ser livre; isso deve ser uma decisão operacional consciente.

## 12. Estratégia de teste e critérios de aceitação

Além dos testes unitários e de integração já exigidos para o projeto, a arquitetura requer testes de sistemas distribuídos. Os cenários mínimos são:

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Retry de cliente | Cortar resposta após commit e reenviar. | Uma única retirada e mesmo resultado por `operation_id`. |
| Corrida pelo mesmo ticket | Enviar duas confirmações concorrentes. | Exatamente uma `CONFIRMED`; outra `CONFLICT`. |
| Queda do líder | Interromper líder antes e depois de alcançar quórum. | Antes: não confirmada; depois: preservada; líder novo eleito com maioria. |
| Seguidor desatualizado | Desligar um nó, operar e religá-lo. | Ele recupera snapshot/log e alcança o mesmo índice. |
| Partição 1/2 | Separar um coordenador dos outros dois. | Grupo 2 confirma; grupo 1 apenas consulta. |
| Partição 1/1/1 | Isolar todos. | Nenhuma confirmação final nova. |
| Snapshot divergente | Tentar adicionar nó com hash ou evento diferente. | Entrada recusada e alerta operacional. |
| Credencial revogada | Revogar staff e reenviar comando. | Novo comando recusado; auditoria preservada. |
| Reinício | Reiniciar coordenador após commit. | Projeção e auditoria são reconstruídas sem perda. |

Critérios de aceitação de produção devem incluir, no mínimo:

- teste automatizado que demonstre exclusividade de ticket sob concorrência e falhas;
- recuperação automática após perda de um coordenador;
- inexistência de escrita cruzada em arquivos SQLite;
- auditoria final idêntica em todos os coordenadores saudáveis;
- exercício de operação com pessoas não desenvolvedoras seguindo apenas o runbook;
- monitoramento capaz de detectar falta de quórum antes de a fila operar em condição insegura.

## 13. Observabilidade, suporte e auditoria

Cada coordenador precisa manter logs estruturados com `cluster_id`, `event_id`, `node_id`, termo, índice de log, `operation_id`, `request_id` e resultado — sem segredos ou dados pessoais desnecessários. O painel de suporte deve mostrar:

- membros configurados, alcançáveis e votantes;
- líder atual e duração do termo;
- último índice confirmado e último índice aplicado de cada nó;
- hash/versão de snapshot de cada nó;
- tamanho e idade das filas de staff, operações pendentes e conflitos;
- latência de commit e taxa de reconexão;
- histórico de eleição, entrada/saída e perda de quórum.

Para auditoria pós-evento, exportar o log confirmado em formato portátil junto com manifesto de hashes e versão de protocolo. O export deve ser reproduzível: mesma entrada confirmada produz a mesma lista de retiradas, sem depender de uma UI ou do relógio de um dispositivo.

## 14. Riscos e mitigações

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Wi-Fi instável ou hotspot saturado | Perda de quórum ou latência alta. | Site survey, rede dedicada, 3 coordenadores próximos, métricas e plano por lotes. |
| Complexidade de consenso implementada incorretamente | Duplicidade ou perda de decisão. | POC isolada, biblioteca/protocolo revisado, testes de partição e revisão especializada. |
| Operação não entende “pendente” | Kit entregue antes de commit. | UX explícita, treinamento, cor/estado diferente e runbook curto. |
| Relógios errados | Auditoria temporal confusa. | Ordem por índice do log; horário apenas informativo; NTP local opcional, nunca critério de conflito. |
| Dados de evento diferentes entre nós | Busca/decisão incoerente. | Snapshot assinado com hash e gate de abertura 3/3. |
| Perda de dois coordenadores | Operação de confirmação para. | Energia, equipamentos sobressalentes e contingência pré-alocada; não prometer tolerância que 3 nós não fornecem. |
| Chaves/tokens vazados na LAN | Comando indevido ou exposição. | Credenciais de curta duração, revogação, segregação de papéis, não logar segredos e revisão de TLS. |
| Migração de histórico mal feita | Auditoria incompleta. | Importador versionado, backup imutável, contagens/hashes comparados e rollback antes de piloto. |

## 15. Decisões que ainda exigem aprovação

Este documento recomenda, mas não pode escolher sozinho, os seguintes pontos de produto/operação:

1. A organização aceita bloquear confirmações novas quando não há maioria de coordenadores?
2. Há disponibilidade de três equipamentos alimentados e uma pessoa responsável por eles em cada evento?
3. A contingência por lotes é necessária desde o primeiro lançamento ou pode ser posterior?
4. Qual latência máxima é aceitável para exibir `CONFIRMED` e liberar a entrega?
5. Quem pode executar undo, ativar contingência e selar o evento?
6. Qual política de retenção, exportação e acesso à auditoria atende às obrigações de privacidade?
7. O primeiro lançamento exige TLS na LAN ou autenticação/assinatura em HTTP local é suficiente sob a avaliação de risco?

## 16. Recomendação final

Adotar o cluster local de três coordenadores é a evolução mais segura se a prioridade é remover a dependência de um único desktop **sem** aceitar retirada duplicada. Ele não transforma o sistema em uma malha totalmente disponível em qualquer condição; isso seria incompatível com a garantia física que o produto precisa oferecer. Em vez disso, troca um ponto único de falha por uma maioria local e previsível.

O caminho responsável é provar primeiro a semântica de eventos e recuperação em um nó, depois os cenários de falha em três nós, e somente então conectar o mobile e pilotar em operação. Sincronização de SQLite, merge por timestamp e P2P eventual devem permanecer fora do caminho crítico de confirmação.
