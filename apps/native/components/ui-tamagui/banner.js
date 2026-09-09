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
exports.Banner = Banner;
var tamagui_1 = require("tamagui");
var BannerFrame = (0, tamagui_1.styled)(tamagui_1.YStack, {
    padding: "$3",
    borderRadius: "$3",
    borderWidth: 1,
    variants: {
        variant: {
            info: { backgroundColor: "$accentLight", borderColor: "$accent" },
            warn: { backgroundColor: "rgba(245,158,11,0.15)", borderColor: "$warning" },
            error: { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "$danger" },
            success: { backgroundColor: "rgba(16,185,129,0.15)", borderColor: "$success" },
        },
    },
    defaultVariants: { variant: "info" },
});
function Banner(_a) {
    var _b = _a.variant, variant = _b === void 0 ? "info" : _b, props = __rest(_a, ["variant"]);
    return <BannerFrame variant={variant} {...props}/>;
}
