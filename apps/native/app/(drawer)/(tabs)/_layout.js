"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TabLayout;
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var expo_router_1 = require("expo-router");
var heroui_native_1 = require("heroui-native");
var theme_colors_1 = require("@/utils/theme-colors");
function TabLayout() {
    var themeColorForeground = (0, heroui_native_1.useThemeColor)("foreground");
    var themeColorBackground = (0, heroui_native_1.useThemeColor)("background");
    var fg = (0, theme_colors_1.safeThemeColor)(themeColorForeground, "#000000");
    var bg = (0, theme_colors_1.safeThemeColor)(themeColorBackground, "#ffffff");
    return (<expo_router_1.Tabs screenOptions={{
            headerShown: false,
            headerStyle: {
                backgroundColor: bg,
            },
            headerTintColor: fg,
            headerTitleStyle: {
                color: fg,
                fontWeight: "600",
            },
            tabBarStyle: {
                backgroundColor: bg,
            },
        }}>
      <expo_router_1.Tabs.Screen name="index" options={{
            title: "Home",
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<Ionicons_1.default name="home" size={size} color={color}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="two" options={{
            title: "Explore",
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<Ionicons_1.default name="compass" size={size} color={color}/>);
            },
        }}/>
    </expo_router_1.Tabs>);
}
