# Estratégia de Testes

## Princípios

1. Bug fix sempre inclui teste de não-regressão.
2. Feature nova inclui teste unitário e/ou integração.
3. Mudança sensível de config (Metro/Expo/Tauri/turbo) exige teste e/ou incident doc.

## Pirâmide atual

1. Unit (TypeScript/Jest): utilitários, fila, clients, invariantes de config.
2. Integration (Rust/cargo test): handlers/services/repository com SQLite.
3. Smoke (scripts): metro bundling e política de mudanças.

## Comandos

```bash
pnpm turbo run lint
pnpm turbo run typecheck
pnpm turbo run test
pnpm turbo run build
pnpm --filter web run test
pnpm --filter native run test
cargo test --manifest-path apps/web/src-tauri/Cargo.toml
```

## Gate de PR

1. Lint, typecheck, test e build devem passar.
2. `scripts/verify-change-policy.mjs` valida alterações sensíveis.
3. Harness de bundling Metro executa em CI.
