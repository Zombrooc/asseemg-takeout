"use strict";
/**
 * Tamagui config — tokens e temas alinhados ao DESIGN_SYSTEM do v0.
 * Referência: v0-redesenho-ui-tauri DESIGN_SYSTEM.md
 * Cores semânticas: primary #2563eb, success #10b981, warning #f59e0b, error #ef4444, etc.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
var v5_1 = require("@tamagui/config/v5");
var tamagui_1 = require("tamagui");
// Tokens de cor do V0 (Design System)
var v0Colors = {
    // Semânticos
    background: "#ffffff",
    foreground: "#111827",
    muted: "#9ca3af",
    card: "#f9fafb",
    border: "#e5e7eb",
    accent: "#2563eb",
    accentLight: "#dbeafe",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#2563eb",
    overlay: "rgba(0,0,0,0.5)",
    // Texto
    textPrimary: "#111827",
    textSecondary: "#6b7280",
    textTertiary: "#9ca3af",
};
exports.config = (0, tamagui_1.createTamagui)(__assign(__assign({}, v5_1.defaultConfig), { themes: __assign(__assign({}, v5_1.defaultConfig.themes), { light: __assign(__assign(__assign({}, (_a = v5_1.defaultConfig.themes) === null || _a === void 0 ? void 0 : _a.light), v0Colors), { 
            // Mapeamentos comuns
            bg: v0Colors.background, color: v0Colors.foreground, borderColor: v0Colors.border, background: v0Colors.background, foreground: v0Colors.foreground, muted: v0Colors.muted, card: v0Colors.card, border: v0Colors.border, accent: v0Colors.accent, success: v0Colors.success, warning: v0Colors.warning, danger: v0Colors.danger, info: v0Colors.info, overlay: v0Colors.overlay }), dark: __assign(__assign({}, (_b = v5_1.defaultConfig.themes) === null || _b === void 0 ? void 0 : _b.dark), { background: "#111827", foreground: "#f9fafb", muted: "#6b7280", card: "#1f2937", border: "#374151", accent: "#3b82f6", accentLight: "#1e3a8a", success: "#34d399", warning: "#fbbf24", danger: "#f87171", info: "#60a5fa", overlay: "rgba(0,0,0,0.7)", textPrimary: "#f9fafb", textSecondary: "#9ca3af", textTertiary: "#6b7280", bg: "#111827", color: "#f9fafb", borderColor: "#374151" }) }), media: __assign({}, v5_1.defaultConfig.media), shorthands: __assign(__assign({}, v5_1.defaultConfig.shorthands), { p: "padding", px: "paddingHorizontal", py: "paddingVertical", pt: "paddingTop", pb: "paddingBottom", pl: "paddingLeft", pr: "paddingRight", m: "margin", mx: "marginHorizontal", my: "marginVertical", mt: "marginTop", mb: "marginBottom", ml: "marginLeft", mr: "marginRight", bg: "backgroundColor", br: "borderRadius", ai: "alignItems", jc: "justifyContent" }) }));
