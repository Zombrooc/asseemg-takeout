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
var heroui_native_1 = require("heroui-native");
var card_1 = require("@/components/ui/card");
function Banner(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<card_1.Card variant="tertiary" className={(0, heroui_native_1.cn)("p-3 rounded-xl border border-border bg-card", className)} {...props}/>);
}
