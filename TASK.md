# Task (2026-03-14)

## Funcionalidade: Exportar check-ins por evento

Implementar exportação dos check-ins de um evento específico, permitindo que o admin escolha quais campos deseja exportar.

### Requisitos
- Seleção de evento específico para exportação.
- Admin pode escolher os campos/dados a serem incluídos na exportação.
- Suporte a exportação em:
  - CSV separado por vírgula, com suporte a UTF-8.
  - JSON.

### Observações
- Garantir que o CSV seja válido e compatível com leitores comuns (Excel/Google Sheets).
- Manter consistência com os dados de auditoria já existentes.
