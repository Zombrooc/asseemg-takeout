# apps/native

App mobile Expo para operação de retirada em LAN.

## Scripts

```bash
pnpm run dev
pnpm run test
pnpm run android
pnpm run ios
```

## Observações

1. Consome API do desktop em `:5555`.
2. Realtime via WebSocket com reconnect/backoff.
3. Em dispositivo físico, use o IP do desktop na LAN na tela de pareamento (ex.: `http://192.168.0.5:5555`). O default `127.0.0.1` só funciona em emulador no mesmo host. Em build de produção, a URL default é a embutida no build (`EXPO_PUBLIC_SERVER_URL` em build time).
