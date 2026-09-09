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
exports.badgeVariants = void 0;
exports.Badge = Badge;
var merge_props_1 = require("@base-ui/react/merge-props");
var use_render_1 = require("@base-ui/react/use-render");
var class_variance_authority_1 = require("class-variance-authority");
var utils_1 = require("@/lib/utils");
var badgeVariants = (0, class_variance_authority_1.cva)("h-5 gap-1 rounded-none border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden group/badge", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
            secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
            destructive: "bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20",
            outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
            ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
            link: "text-primary underline-offset-4 hover:underline",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
exports.badgeVariants = badgeVariants;
function Badge(_a) {
    var className = _a.className, _b = _a.variant, variant = _b === void 0 ? "default" : _b, render = _a.render, props = __rest(_a, ["className", "variant", "render"]);
    return (0, use_render_1.useRender)({
        defaultTagName: "span",
        props: (0, merge_props_1.mergeProps)({
            className: (0, utils_1.cn)(badgeVariants({ variant: variant }), className),
        }, props),
        render: render,
        state: {
            slot: "badge",
            variant: variant,
        },
    });
}
