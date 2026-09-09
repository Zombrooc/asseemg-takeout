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
exports.Card = Card;
var heroui_native_1 = require("heroui-native");
function Card(_a) {
    var className = _a.className, _b = _a.variant, variant = _b === void 0 ? "secondary" : _b, props = __rest(_a, ["className", "variant"]);
    return <heroui_native_1.Surface variant={variant} className={(0, heroui_native_1.cn)("p-4 rounded-2xl", className)} {...props}/>;
}
