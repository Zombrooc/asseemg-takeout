/**
 * Mapas estáticos de classes Uniwind alinhados aos tokens v0.
 * Usar estes mapas em vez de concatenação dinâmica para evitar estilos que somem no build.
 * Referência: v0-redesenho-ui-tauri components/mobile/tokens.ts
 */

/** Variantes de status (LIVE/OFFLINE, conexão) */
export const STATUS_PILL_CLASS = {
  online: "bg-success/20 border-success",
  offline: "bg-danger/20 border-danger",
} as const;

/** Background de card/banner por estado de conexão */
export const CONNECTION_BG_CLASS = {
  reachable: "bg-success/10",
  unreachable: "bg-danger/10",
  loading: "bg-muted/10",
} as const;

/** Badge de status de participante/auditoria */
export const BADGE_STATUS_CLASS = {
  confirmed: "bg-success/20 text-foreground",
  duplicate: "bg-warning/20 text-foreground",
  failed: "bg-danger/20 text-foreground",
  pending: "bg-muted/20 text-foreground",
} as const;

export type StatusPillVariant = keyof typeof STATUS_PILL_CLASS;
export type ConnectionBgVariant = keyof typeof CONNECTION_BG_CLASS;
export type BadgeStatusVariant = keyof typeof BADGE_STATUS_CLASS;
