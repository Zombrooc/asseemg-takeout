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
exports.CardHeader = CardHeader;
exports.CardFooter = CardFooter;
exports.CardTitle = CardTitle;
exports.CardAction = CardAction;
exports.CardDescription = CardDescription;
exports.CardContent = CardContent;
var React = require("react");
var utils_1 = require("@/lib/utils");
function Card(_a) {
    var className = _a.className, _b = _a.size, size = _b === void 0 ? "default" : _b, props = __rest(_a, ["className", "size"]);
    return (<div data-slot="card" data-size={size} className={(0, utils_1.cn)("ring-foreground/10 bg-card text-card-foreground gap-4 overflow-hidden rounded-lg border border-border py-4 text-xs/relaxed shadow-sm ring-1 ring-border/50 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-2 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none group/card flex flex-col", className)} {...props}/>);
}
function CardHeader(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-header" className={(0, utils_1.cn)("gap-1 rounded-none px-4 group-data-[size=sm]/card:px-3 [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3 group/card-header @container/card-header grid auto-rows-min items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]", className)} {...props}/>);
}
function CardTitle(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-title" className={(0, utils_1.cn)("text-sm font-medium group-data-[size=sm]/card:text-sm", className)} {...props}/>);
}
function CardDescription(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-description" className={(0, utils_1.cn)("text-muted-foreground text-xs/relaxed", className)} {...props}/>);
}
function CardAction(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-action" className={(0, utils_1.cn)("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props}/>);
}
function CardContent(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-content" className={(0, utils_1.cn)("px-4 group-data-[size=sm]/card:px-3", className)} {...props}/>);
}
function CardFooter(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<div data-slot="card-footer" className={(0, utils_1.cn)("rounded-none border-t p-4 group-data-[size=sm]/card:p-3 flex items-center", className)} {...props}/>);
}
