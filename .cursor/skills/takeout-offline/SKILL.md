---
name: takeout-offline
description: Implements and reviews code for the takeout ecosystem (desktop Tauri, mobile). Use when working on takeout desktop, takeout mobile, pairing, CSV import, participant search, or takeout confirmation flows.
---

# Takeout Offline

Use when implementing or reviewing code in the takeout ecosystem (desktop, mobile).

## Takeout Desktop

- **API**: HTTP server in same process as Tauri app; port **5555**, bind `0.0.0.0` for LAN access.
- **IP discovery**: List all IPv4 addresses of local interfaces (multi-NIC); show on initial screen.
- **Connection QR**: URL = `http://<IP>:5555` with `pairing_token` in query or fragment; short, expiring token; UI option to "renew" token.
- **Import CSV**: Expected columns: nome, cpf, data_nascimento, idade, ticket_comprado, categoria_ticket, status_takeout, valor_pago, custom_forms or custom_*; validate columns before import; preview; upsert by ticket_id and/or (cpf + data_nascimento); normalize custom_forms (if JSON string, parse; if column-based, map to key/value).

## Takeout Mobile

- **Connection**: Read QR (URL + pairing_token) or type IP:port; POST `/pair` with device_id + pairing_token; store access_token (e.g. expo-secure-store).
- **Search**: Modes qr | ticket_id | nome | cpf | birth_date; GET `/participants/search?q=...&mode=...` or GET `/participants/:id` for QR/ticket_id.
- **Confirmation modal**: Show participant (nome, cpf, data nascimento, idade, ticket, categoria, custom_forms, status takeout, valor pago); "Confirmar retirada" button.
- **Confirmation queue**: Persist pending attempts locally; retry with backoff; remove only when response is CONFIRMED; payload: request_id (UUID), timestamp, staff_device_id, ticket_id/participant_id.

## Contratos e client

- **Types e client HTTP**: `apps/web/src/lib/takeout-api.ts` — BASE_URL (default `http://127.0.0.1:5555`), types (HealthResponse, ConnectionInfo, TakeoutConfirmPayload, etc.), funções `getHealth`, `getConnectionInfo`, `confirmTakeout`, `getAudit`, etc.
- **Mobile**: usa esses types ou reimplementa chamadas; `request_id` é gerado no client (UUID v4), e.g. em `apps/native/components/takeout/confirm-takeout-modal.tsx`.
- `packages/api` existe mas está vazio (contratos vivem no frontend).

## External references

- React Native: [.agents/skills/vercel-react-native-skills/AGENTS.md](.agents/skills/vercel-react-native-skills/AGENTS.md).
- React composition and best practices when applicable (avoid prop drilling, minimal state).
