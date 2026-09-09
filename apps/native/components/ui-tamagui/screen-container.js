"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenContainer = ScreenContainer;
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_native_2 = require("react-native");
var tamagui_1 = require("tamagui");
function ScreenContainer(props) {
    var _a, _b;
    var children = props.children, _c = props.keyboardAware, keyboardAware = _c === void 0 ? true : _c;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var mode = (_a = props.mode) !== null && _a !== void 0 ? _a : "scroll";
    var insetStyle = {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
    };
    var body = mode === "flatlist" ? (<react_native_2.FlatList keyboardShouldPersistTaps="handled" {...props.flatListProps} contentContainerStyle={[
            { flexGrow: 1 },
            props.flatListProps.contentContainerStyle,
        ]}/>) : mode === "static" ? (<tamagui_1.YStack flex={1}>{children}</tamagui_1.YStack>) : (<react_native_2.ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" {...props.scrollViewProps} contentContainerStyle={[{ flexGrow: 1 }, (_b = props.scrollViewProps) === null || _b === void 0 ? void 0 : _b.contentContainerStyle]}>
        {children}
      </react_native_2.ScrollView>);
    var content = (<tamagui_1.YStack flex={1} backgroundColor="$background" style={insetStyle}>
      {body}
    </tamagui_1.YStack>);
    if (!keyboardAware)
        return content;
    return (<react_native_1.KeyboardAvoidingView style={{ flex: 1 }} behavior={react_native_1.Platform.OS === "ios" ? "padding" : undefined}>
      {content}
    </react_native_1.KeyboardAvoidingView>);
}
