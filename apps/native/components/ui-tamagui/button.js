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
exports.Button = Button;
var tamagui_1 = require("tamagui");
var StyledButton = (0, tamagui_1.styled)(tamagui_1.Button, {
    backgroundColor: "$accent",
    color: "white",
    borderRadius: "$4",
    paddingHorizontal: "$4",
    paddingVertical: "$3",
    pressStyle: { opacity: 0.9 },
    variants: {
        variant: {
            primary: { backgroundColor: "$accent", color: "white" },
            secondary: { backgroundColor: "$card", borderWidth: 1, borderColor: "$border", color: "$foreground" },
            bordered: { backgroundColor: "$card", borderWidth: 1, borderColor: "$border", color: "$foreground" },
            outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "$border", color: "$accent" },
            ghost: { backgroundColor: "transparent", color: "$textSecondary" },
            danger: { backgroundColor: "$danger", color: "white" },
        },
        disabled: { true: { opacity: 0.5 } },
    },
    defaultVariants: { variant: "primary", disabled: false },
});
function Button(_a) {
    var loading = _a.loading, isLoading = _a.isLoading, isDisabled = _a.isDisabled, children = _a.children, disabled = _a.disabled, testID = _a.testID, props = __rest(_a, ["loading", "isLoading", "isDisabled", "children", "disabled", "testID"]);
    var busy = loading !== null && loading !== void 0 ? loading : isLoading;
    var isDisabledState = disabled !== null && disabled !== void 0 ? disabled : isDisabled;
    return (<StyledButton disabled={isDisabledState || busy} testID={testID} {...props}>
      {busy ? <tamagui_1.Spinner color="white" size="small"/> : children}
    </StyledButton>);
}
