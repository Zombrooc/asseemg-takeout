"use client";
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
exports.Label = Label;
var React = require("react");
var utils_1 = require("@/lib/utils");
function Label(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (
    // biome-ignore lint/a11y/noLabelWithoutControl: base label primitive is paired by consumers.
    <label data-slot="label" className={(0, utils_1.cn)("gap-2 text-xs leading-none group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed", className)} {...props}/>);
}
