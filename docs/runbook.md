# Runbook operacional — ASSEEMG Retira

Use este runbook antes de alterar código ou pedir ao operador uma ação destrutiva. O fluxo atual é Electron (`apps/desktop`), não Tauri.

## Desktop não inicia ou API não responde

1. Confirmar que não há outra instância Electron presa e que a porta `5555` está livre.
2. Verificar o `takeout.db` no diretório `app.getPath("userData")`; não apagar nem substituir o arquivo.
3. Testar `http://127.0.0.1:5555/health`.
4. Se houver problema de banco, preservar cópia e executar primeiro `pnpm --dir apps/desktop test`/`typecheck`; o schema aplica migrações na inicialização.
5. Encerrar o desktop normalmente para que WebSocket e banco sejam fechados.

## Pareamento falha

1. Testar `GET /network/addresses` no desktop e escolher o IP marcado como primário.
2. Renovar o QR/token com `POST /pair/renew`; o token expira em 15 minutos.
3. Confirmar que mobile e desktop estão na mesma LAN e que o firewall permite TCP `5555`.
4. Testar `<ip>:5555/health` a partir do dispositivo móvel.
5. Confirmar que o alias do operador foi informado. Não registrar o token em logs.

## Android/iOS retorna “Network request failed”

1. Não usar `127.0.0.1` no mobile: usar o IP LAN do desktop.
2. Confirmar permissão de HTTP claro na configuração atual do Expo.
3. Testar a rota `/health` na mesma rede.
4. Verificar VPN, hotspot, isolamento de clientes do Wi-Fi e firewall do Windows.

## Check-in ficou pendente

1. Tratar `pending`/`sending` como não confirmado até `ack`.
2. Confirmar conectividade HTTP ou estado operacional do WebSocket.
3. Não gerar novo UUID nem remover a operação.
4. Aguardar o worker; lease expirado retorna a operação para `pending`.
5. Se virar `conflict`, conferir auditoria no desktop e resolver com operador; se virar `failed`, preservar erro e investigar.

## Conflito ou duplicidade

- `DUPLICATE`: mesma operação já foi aceita; não repetir manualmente.
- `CONFLICT`/`CHECKIN_ALREADY_CONFIRMED`: outro request confirmou o alvo; conferir auditoria.
- `IDEMPOTENCY_PAYLOAD_MISMATCH`: o mesmo ID foi reutilizado com payload diferente; parar e investigar.
- Não editar diretamente SQLite durante o evento.

## Locks

Lock dura 30 segundos e só o dispositivo dono renova. Se a UI mostrar outro operador:

1. aguardar expiração ou pedir ao operador dono para sair;
2. confirmar o estado pelo realtime;
3. não deletar lock de outro dispositivo sem procedimento operacional explícito.

## Realtime não atualiza

1. Confirmar `connection.ready` e heartbeat de 30 s.
2. Verificar que o cliente reconecta em até 90 s e assina o evento com cursor.
3. Consultar `GET /sync/events?eventId=...&sinceSeq=...` para diagnóstico.
4. Não resetar cursor nem apagar snapshot como primeira ação; replay é a recuperação normal.

## Importação

- JSON: `POST /sync/import`; upsert atômico de evento/participantes/tickets.
- CSV: `POST /admin/import/legacy-csv`; validar nome, data e arquivo antes de confirmar.
- Após importação, validar contagem, busca por CPF/ticket/QR e fonte do evento antes de iniciar atendimento.
- `POST /sync/pull` e `/sync/push` retornarem 503 é comportamento esperado no modo offline.

## Gates antes de entregar mudança

```bash
pnpm --dir apps/desktop typecheck
pnpm --dir apps/desktop lint
pnpm --dir apps/desktop test
pnpm --dir apps/desktop build
```

Para native, acrescentar `pnpm --dir apps/native test`; para contratos/monorepo, `pnpm typecheck`.
