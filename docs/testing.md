# Estratégia de testes

## Princípios

1. Bug fix sempre inclui teste de regressão.
2. Feature nova inclui teste unitário e/ou integração.
3. Fluxos mutáveis cobrem idempotência, retry, conflito e persistência quando aplicável.
4. Mudança de contrato exige testes nos consumidores desktop/native.
5. Mudança de configuração Expo/Metro/Electron exige teste ou documento de incidente.

## Pirâmide atual

1. Unit/integration TypeScript: SQLite, servidor HTTP/WS, contratos, importação, exportação, pairing, locks e estado de participante.
2. Mobile Jest: API, banco local, outbox, sync manager, realtime e componentes de confirmação.
3. Build/typecheck: Electron desktop, native e contratos.

## Comandos

```bash
pnpm --dir apps/desktop typecheck
pnpm --dir apps/desktop lint
pnpm --dir apps/desktop test
pnpm --dir apps/desktop build
pnpm --dir apps/native test
pnpm typecheck
```

## Gate de mudança

- Check-in: testar UUID estável, DUPLICATE, CONFLICT, undo e auditoria.
- Outbox: testar transação local, lease, retry, timeout e falha.
- Realtime: testar hello/auth, cursor, replay, heartbeat e reconexão.
- Locks: testar TTL, renovação pelo dono e rejeição de outro dispositivo.
- Dados: testar migração, WAL/foreign keys e não mistura de fontes.

