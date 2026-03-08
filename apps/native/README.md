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
4. A conexão com o desktop é HTTP; o app exige config nativa (Android cleartext, iOS ATS) para permitir HTTP na LAN. Remover essa config causa "Network request failed". Detalhes: [docs/incidents/2026-02-24-network-request-failed-lan.md](../../docs/incidents/2026-02-24-network-request-failed-lan.md).
5. **Scanner QR (pareamento/ingresso):** Usamos `expo-camera` com `onCameraReady` antes de ativar `onBarcodeScanned` e throttle no callback para maior confiabilidade em builds de produção. Em alguns dispositivos Android o callback pode não disparar (ver issues expo/expo#21929, #21605); se persistir, considerar lib nativa alternativa (ex.: react-native-vision-camera + plugin de barcode).
