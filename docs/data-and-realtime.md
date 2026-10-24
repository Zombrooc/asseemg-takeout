# Dados e realtime

## Autoridade

O SQLite do Electron (`takeout.db`, em `app.getPath("userData")`) é a fonte de verdade. O desktop usa WAL e `foreign_keys=ON`, aplica migrações aditivas na inicialização e mantém histórico operacional em `takeout_events`/`legacy_checkins` e `event_log`.

O SQLite do Expo é durável, mas é uma projeção local: snapshots em `participant_entities`, estado de confirmação em `local_checkin_projection`, intenções em `sync_operations` e cursores em `sync_cursors`. React Query e o estado em memória são apenas caches.

## Famílias de entidades

- `json_sync`: participante + ticket; check-in é único por ticket.
- `legacy_csv`: participante legado; check-in é único por participante/evento.

Nunca reutilizar a chave de uma família na outra. A fonte deve acompanhar cada snapshot, operação, evento e projeção.

## WebSocket `/ws`

O protocolo versionado é autenticado e tem limite de 64 KiB por mensagem:

1. cliente envia `connection.hello` com token e device ID;
2. servidor responde `connection.ready` com `serverInstanceId`;
3. cliente envia `sync.subscribe` com evento e `lastSeq`;
4. servidor faz replay, envia `lock_snapshot` e `sync.completed`;
5. comandos de confirmação usam `command.execute`; respostas são `command.ack` ou `command.rejected`.

O servidor envia heartbeat a cada 30 s. O cliente usa timeout de 90 s e reconexão com backoff de 1,5 s a 15 s. O servidor reproduz até 250 eventos por lote e o mobile aplica evento + cursor numa única transação. `seq` é global da autoridade e não precisa ser contíguo dentro de um evento.

Eventos importantes: `participant_checked_in`, `participant_checkin_reverted`, `participant_updated`, `lock_acquired`, `lock_renewed`, `lock_released`, `lock_snapshot`, `events_list_changed` e `sync.completed`.

## Atomicidade

No desktop, confirmação insere o check-in, a auditoria e o evento persistido na mesma transação; só depois transmite. No mobile, enqueue grava a operação e a projeção `pending` juntas; ack atualiza outbox, projeção e participante juntos. Toda escrita Expo passa pelo coordenador serializado para evitar `SQLITE_BUSY` entre conexões de transação exclusiva.

## Segurança operacional

Não registrar tokens, CPF ou payload completo. O transporte LAN é HTTP sem TLS por decisão operacional atual; usar apenas em rede confiável/isolada. Pairing e Bearer token não substituem autorização futura para uma rede hostil.
