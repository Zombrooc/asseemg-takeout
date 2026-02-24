# Incident: Tauri release abre janela em branco (UI não renderiza)

## Resumo executivo

- **O que ocorreu:** no build desktop (Tauri), a janela abria sem conteúdo visível.
- **Sintoma correlato:** abrir `apps/web/dist/index.html` diretamente também resultava em tela em branco.
- **Impacto:** pacote de produção aparentemente "abre", mas sem interface operacional.

## Sintomas observáveis

1. Em `desktop:dev`, UI funciona normalmente.
2. Em `desktop:build` + execução do instalador/app empacotado, janela abre e fica vazia.
3. `apps/web/dist/index.html` gerado por Vite não renderiza corretamente quando aberto fora de host HTTP com raiz adequada.

## Causa raiz

1. **Paths absolutos de assets no build web** (`/assets/...`) eram incompatíveis com runtime desktop em alguns contextos de carregamento.
2. **Risco secundário de chunking manual:** estratégia de `manualChunks` gerava warning de ciclo (`vendor-misc -> vendor -> vendor-misc`), aumentando risco de comportamento de runtime inesperado.
3. **Bootstrap de rota sensível à URL inicial:** quando a URL chegava como `/index.html`, o roteador podia não cair na rota esperada sem normalização explícita.
4. **Ruído de runtime:** referência de favicon inexistente (`/favicon.ico`) gerava erro desnecessário no runtime.

## Correção aplicada

1. `apps/web/vite.config.ts`
- `base` condicional: `./` em build, `/` em dev.
- remoção de `manualChunks` customizado para eliminar ciclo de chunks.

2. `apps/web/src/main.tsx`
- normalização da URL inicial antes do boot do router.
- regras: `file:` => `/`; `.../index.html` => rota normalizada.

3. `apps/web/src/lib/initial-location.ts`
- extração da regra de normalização para módulo testável.

4. `apps/web/src/routes/__root.tsx`
- remoção do link de favicon inexistente.

## Não-regressão adicionada

1. **Teste unitário**
- `apps/web/src/lib/initial-location.test.ts`
- cobre normalização de `file:` e `/index.html`.

2. **Teste de integração**
- `scripts/test-harness/tauri-web-build-regression.mjs`
- executa build web e falha se `apps/web/dist/index.html` contiver `"/assets/"`.
- também valida presença de `"./assets/"`.

## Sinais precoces para detectar retorno do bug

1. `apps/web/dist/index.html` com `src="/assets/...` ou `href="/assets/...`.
2. Warning de ciclo de chunks no build web.
3. Janela Tauri release abrindo sem erro de crash, mas sem render.

## Checklist para mudanças futuras em build desktop

- [ ] Ao alterar `vite.config.ts` ou `tauri.conf.json`, executar `pnpm --filter web run test`.
- [ ] Confirmar que `dist/index.html` usa `./assets`.
- [ ] Manter teste de integração do harness verde no CI.
