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
exports.Screen = Screen;
exports.Container = Container;
var heroui_native_1 = require("heroui-native");
var react_native_1 = require("react-native");
var primitives_1 = require("@/lib/primitives");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
function Screen(props) {
    var _a;
    var children = props.children, className = props.className, contentClassName = props.contentClassName, _b = props.keyboardAware, keyboardAware = _b === void 0 ? true : _b, rest = __rest(props, ["children", "className", "contentClassName", "keyboardAware"]);
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var mode = (_a = props.mode) !== null && _a !== void 0 ? _a : "scroll";
    var body = (function () {
        if (mode === "flatlist") {
            var flatListProps = props.flatListProps;
            return (<primitives_1.FlatList keyboardShouldPersistTaps="handled" {...flatListProps} contentContainerStyle={[
                    { flexGrow: 1 },
                    flatListProps.contentContainerStyle,
                ]}/>);
        }
        if (mode === "static") {
            return <primitives_1.View className={(0, heroui_native_1.cn)("flex-1", contentClassName)}>{children}</primitives_1.View>;
        }
        var scrollViewProps = props.scrollViewProps;
        return (<primitives_1.ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" {...scrollViewProps} contentContainerStyle={[
                { flexGrow: 1 },
                scrollViewProps === null || scrollViewProps === void 0 ? void 0 : scrollViewProps.contentContainerStyle,
            ]}>
        <primitives_1.View className={contentClassName}>{children}</primitives_1.View>
      </primitives_1.ScrollView>);
    })();
    var insetStyle = {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
    };
    var rootView = (<primitives_1.View className={(0, heroui_native_1.cn)("flex-1 bg-background", className)} style={insetStyle} {...rest}>
      {body}
    </primitives_1.View>);
    if (!keyboardAware) {
        return rootView;
    }
    return (<react_native_1.KeyboardAvoidingView style={[{ flex: 1 }]} behavior={react_native_1.Platform.OS === "ios" ? "padding" : undefined}>
      {rootView}
    </react_native_1.KeyboardAvoidingView>);
}
function Container(props) {
    return <Screen {...props}/>;
}
