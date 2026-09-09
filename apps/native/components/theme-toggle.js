"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeToggle = ThemeToggle;
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var Haptics = require("expo-haptics");
var react_native_1 = require("react-native");
var primitives_1 = require("@/lib/primitives");
var react_native_reanimated_1 = require("react-native-reanimated");
var uniwind_1 = require("uniwind");
var app_theme_context_1 = require("@/contexts/app-theme-context");
var StyledIonicons = (0, uniwind_1.withUniwind)(Ionicons_1.default);
function ThemeToggle() {
    var _a = (0, app_theme_context_1.useAppTheme)(), toggleTheme = _a.toggleTheme, isLight = _a.isLight;
    return (<primitives_1.Pressable onPress={function () {
            if (react_native_1.Platform.OS === "ios") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            toggleTheme();
        }} className="px-2.5">
      {isLight ? (<react_native_reanimated_1.default.View key="moon" entering={react_native_reanimated_1.ZoomIn} exiting={react_native_reanimated_1.FadeOut}>
          <StyledIonicons name="moon" size={20} className="text-foreground"/>
        </react_native_reanimated_1.default.View>) : (<react_native_reanimated_1.default.View key="sun" entering={react_native_reanimated_1.ZoomIn} exiting={react_native_reanimated_1.FadeOut}>
          <StyledIonicons name="sunny" size={20} className="text-foreground"/>
        </react_native_reanimated_1.default.View>)}
    </primitives_1.Pressable>);
}
