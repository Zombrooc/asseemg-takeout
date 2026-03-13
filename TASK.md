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

## Funcionalidade: Melhorar sizing de textos e botões no app mobile

Aprimorar o sistema de sizing de textos e botões no app mobile para garantir legibilidade e organização, independentemente do tamanho de fonte configurado no dispositivo ou do tamanho da tela.

### Requisitos
- Ajustar tipografia para manter hierarquia visual clara em diferentes escalas de fonte.
- Botões e áreas de toque devem permanecer confortáveis e acessíveis em telas pequenas e grandes.
- Layout deve evitar quebras ou sobreposições em fontes maiores.
- Testar em diferentes tamanhos de tela e configurações de fonte para validar o comportamento.
