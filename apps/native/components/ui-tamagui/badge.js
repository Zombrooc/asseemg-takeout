"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Badge = Badge;
var tamagui_1 = require("tamagui");
var StyledBadge = (0, tamagui_1.styled)(tamagui_1.Text, {
    paddingHorizontal: "$2",
    paddingVertical: "$1",
    borderRadius: "$2",
    fontSize: 12,
    fontWeight: "500",
    variants: {
        variant: {
            default: { backgroundColor: "$muted", color: "$foreground" },
            success: { backgroundColor: "rgba(16,185,129,0.2)", color: "$success" },
            warning: { backgroundColor: "rgba(245,158,11,0.2)", color: "$warning" },
            danger: { backgroundColor: "rgba(239,68,68,0.2)", color: "$danger" },
        },
    },
    defaultVariants: { variant: "default" },
});
function Badge(_a) {
    var _b = _a.variant, variant = _b === void 0 ? "default" : _b, props = __rest(_a, ["variant"]);
    return <StyledBadge variant={variant} {...props}/>;
}
