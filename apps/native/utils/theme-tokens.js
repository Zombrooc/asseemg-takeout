"use strict";
/**
 * Mapas estáticos de classes Uniwind alinhados aos tokens v0.
 * Usar estes mapas em vez de concatenação dinâmica para evitar estilos que somem no build.
 * Referência: v0-redesenho-ui-tauri components/mobile/tokens.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BADGE_STATUS_CLASS = exports.CONNECTION_BG_CLASS = exports.STATUS_PILL_CLASS = void 0;
/** Variantes de status (LIVE/OFFLINE, conexão) */
exports.STATUS_PILL_CLASS = {
    online: "bg-success/20 border-success",
    offline: "bg-danger/20 border-danger",
};
/** Background de card/banner por estado de conexão */
exports.CONNECTION_BG_CLASS = {
    reachable: "bg-success/10",
    unreachable: "bg-danger/10",
    loading: "bg-muted/10",
};
/** Badge de status de participante/auditoria */
exports.BADGE_STATUS_CLASS = {
    confirmed: "bg-success/20 text-foreground",
    duplicate: "bg-warning/20 text-foreground",
    failed: "bg-danger/20 text-foreground",
    pending: "bg-muted/20 text-foreground",
};
