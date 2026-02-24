# ADR-0004: CI split strict para Linux + Windows

- Status: Accepted
- Data: 2026-02-24
- Donos: Plataforma

## Contexto

A pipeline cobria apenas Linux e não garantia confiabilidade cross-platform.

## Decisão

1. Matriz Ubuntu + Windows para checks comuns (lint/typecheck/test/build).
2. Build Tauri completo e testes Rust no Linux.
3. Smoke Tauri/toolchain no Windows.

## Consequências

- Cobertura melhor de compatibilidade sem custo excessivo de flakiness.

## Plano de validação

Workflow `build-and-measure.yml` verde nos três jobs:
1. `common-checks` (ubuntu/windows)
2. `tauri-linux`
3. `tauri-windows-smoke`
