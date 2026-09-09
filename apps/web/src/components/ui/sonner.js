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
exports.Toaster = void 0;
var lucide_react_1 = require("lucide-react");
var next_themes_1 = require("next-themes");
var sonner_1 = require("sonner");
var Toaster = function (_a) {
    var props = __rest(_a, []);
    var _b = (0, next_themes_1.useTheme)().theme, theme = _b === void 0 ? "system" : _b;
    return (<sonner_1.Toaster theme={theme} className="toaster group" icons={{
            success: <lucide_react_1.CircleCheckIcon className="size-4"/>,
            info: <lucide_react_1.InfoIcon className="size-4"/>,
            warning: <lucide_react_1.TriangleAlertIcon className="size-4"/>,
            error: <lucide_react_1.OctagonXIcon className="size-4"/>,
            loading: <lucide_react_1.Loader2Icon className="size-4 animate-spin"/>,
        }} style={{
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)",
        }} toastOptions={{
            classNames: {
                toast: "cn-toast",
            },
        }} {...props}/>);
};
exports.Toaster = Toaster;
