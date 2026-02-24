# Incident: Network request failed ao conectar React Native ao desktop na LAN

## Resumo executivo

- **O que ocorreu:** O app React Native, em LAN com todos os dispositivos na mesma rede, recebia "Network request failed" ao tentar conectar ao app desktop (API HTTP em `http://IP:5555`). Impacto: impossível parear ou usar o mobile em ambiente real.
- **Quando:** Ao testar conexão/pareamento na LAN após compilar Tauri e React Native.
- **Quem percebeu:** Desenvolvimento local ao conectar device/emulador ao desktop.

## Sintomas observáveis

- **Logs/mensagens:** `fetch` para `http://IP:5555` (ex.: `/health`, `/pair`) falha com "Network request failed" em device ou emulador.
- **Ambientes afetados:** Android (API 28+) e iOS; app em `apps/native` (Expo). Desktop escutando em 0.0.0.0:5555 e acessível na rede.

## Causa raiz

- **Android (API 28+):** Tráfego cleartext (HTTP) é bloqueado por padrão. O projeto não tinha `android:usesCleartextTraffic` configurado.
- **iOS:** App Transport Security (ATS) bloqueia HTTP por padrão. O projeto não tinha `NSAppTransportSecurity` em `infoPlist`.

Sem essa config, as plataformas nativas recusam as requisições HTTP à API do desktop, gerando "Network request failed".

## Como a correção resolve

- **Android:** Plugin `expo-build-properties` em `apps/native/app.json` com `android.usesCleartextTraffic: true`. Dependência `expo-build-properties` em `apps/native/package.json`.
- **iOS:** Em `expo.ios` de `app.json`, `infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads: true`.

É necessário **rebuild nativo** (ex.: `expo run:android`, `expo run:ios` ou EAS Build) após alterar `app.json`/plugins.

## Sinais precoces

- "Network request failed" ao testar pareamento ou qualquer chamada à API do desktop na LAN.
- Remoção do plugin `expo-build-properties` ou do bloco `ios.infoPlist.NSAppTransportSecurity` em `app.json`.

## Prevenções adicionadas

- **Teste de não-regressão:** `apps/native/__tests__/config/lan-http.invariants.test.ts` — garante que `app.json` contém o plugin com `usesCleartextTraffic: true` e `ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads: true`. Se alguém remover a config, o teste falha.
- **Documentação:** Este incident doc; referência em `apps/native/README.md`; menção em `.cursor/rules/takeout-offline.mdc`.
- **Regra:** Não remover o plugin nem o `infoPlist` sem ajustar o teste e a documentação.

## Checklist para futuros fixes/features

- [ ] Para alterações em `app.json` (plugins, ios.infoPlist): verificar se o teste `lan-http.invariants.test.ts` ainda passa e se a doc continua correta.
