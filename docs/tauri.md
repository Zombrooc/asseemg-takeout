# Tauri Desktop

## Papel no produto

`apps/web/src-tauri` executa app desktop e API HTTP local na porta `5555`.

## Comandos

```bash
pnpm --filter web run desktop:dev
pnpm --filter web run desktop:build
cargo test --manifest-path apps/web/src-tauri/Cargo.toml
```

## Contrato frontend↔backend

1. HTTP JSON padronizado com status codes explícitos.
2. WebSocket `/ws` com eventos tipados em `@pickup/api/takeout-contracts`.
3. Heartbeat periódico do backend para liveness.

## Troubleshooting

1. Verificar porta 5555 ocupada.
2. Confirmar acesso `GET /health`.
3. Validar logs da aplicação em modo dev.
