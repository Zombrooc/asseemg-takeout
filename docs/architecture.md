# Arquitetura atual

Para o estado funcional detalhado, consulte [`system-current-state.md`](system-current-state.md). Este arquivo fixa as fronteiras que agentes devem respeitar.

## Monorepo

- `apps/desktop`: Electron atual; UI React/Vite, processo principal, Express, WebSocket e SQLite.
- `apps/native`: Expo/React Native; cliente LAN, snapshot, outbox e realtime.
- `packages/api`: contratos Zod/TypeScript de comandos, eventos e DTOs.
- `apps/server`: stub técnico, sem regras takeout.
- `apps/web` e `apps/web/src-tauri`: legado/referência; não são a implementação atual do desktop.

## Fronteiras

1. Desktop é a autoridade e decide check-in, conflito, undo, locks e auditoria.
2. Mobile pode ler cache local e registrar intenção, mas a confirmação final vem do desktop.
3. Toda operação mutável que cruza a rede precisa de ID idempotente e resposta tratável após timeout.
4. Estado local de participante é sempre escopado por `eventId + sourceType + entityId`.
5. Alterações de contrato devem passar por `packages/api` e cobrir HTTP, WebSocket, desktop e native.

## Caminho de dados

```text
UI desktop/native
  -> client HTTP/WS
  -> apps/desktop/src/main/server.ts
  -> transação SQLite / event_log
  -> broadcast WS após commit
  -> mobile SQLite (snapshot, cursor, projeção)
```

Não introduzir camada Express em `apps/server`, uma segunda autoridade ou uma cópia da implementação Tauri para o fluxo atual.
