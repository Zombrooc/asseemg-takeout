# Rust Backend (Axum + SQLite)

## Estrutura

- `handlers`: endpoints HTTP/WS.
- `services`: regras de negócio.
- `repository`: acesso SQLite.

## Diretrizes

1. Não acoplar regra de negócio direto em handler.
2. Erros devem mapear para status HTTP explícito.
3. Toda correção de bug relevante deve incluir teste no `cargo test`.

## Testes

```bash
cargo test --manifest-path apps/web/src-tauri/Cargo.toml
```
