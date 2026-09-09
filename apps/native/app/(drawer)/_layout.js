"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var MaterialIcons_1 = require("@expo/vector-icons/MaterialIcons");
var expo_router_1 = require("expo-router");
var drawer_1 = require("expo-router/drawer");
var heroui_native_1 = require("heroui-native");
var react_1 = require("react");
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var takeout_realtime_1 = require("@/lib/takeout-realtime");
var theme_colors_1 = require("@/utils/theme-colors");
var primitives_1 = require("@/lib/primitives");
function DrawerLayout() {
    var _a = (0, takeout_connection_context_1.useTakeoutConnection)(), baseUrl = _a.baseUrl, deviceId = _a.deviceId;
    (0, takeout_realtime_1.useEventsListRealtime)(baseUrl, deviceId);
    var themeColorForeground = (0, heroui_native_1.useThemeColor)("foreground");
    var themeColorBackground = (0, heroui_native_1.useThemeColor)("background");
    var fg = (0, theme_colors_1.safeThemeColor)(themeColorForeground, "#000000");
    var bg = (0, theme_colors_1.safeThemeColor)(themeColorBackground, "#ffffff");
    return (<drawer_1.Drawer screenOptions={{
            headerTintColor: fg,
            headerStyle: { backgroundColor: bg },
            headerTitleStyle: {
                fontWeight: "600",
                color: fg,
            },
            drawerStyle: { backgroundColor: bg },
        }}>
      <drawer_1.Drawer.Screen name="index" options={{
            headerTitle: "ASSEEMG Retira - Mobile",
            drawerLabel: function (_a) {
                var color = _a.color, focused = _a.focused;
                return (<primitives_1.Text style={{ color: focused ? color : fg }}>Home</primitives_1.Text>);
            },
            drawerIcon: function (_a) {
                var size = _a.size, color = _a.color, focused = _a.focused;
                return (<Ionicons_1.default name="home-outline" size={size} color={focused ? color : fg}/>);
            },
        }}/>
      <drawer_1.Drawer.Screen name="events/[eventId]" options={{
            headerTitle: "Evento",
            drawerItemStyle: { display: "none" },
        }}/>
      <drawer_1.Drawer.Screen name="audit" options={{
            headerTitle: "Auditoria",
            drawerLabel: function (_a) {
                var color = _a.color, focused = _a.focused;
                return (<primitives_1.Text style={{ color: focused ? color : fg }}>Auditoria</primitives_1.Text>);
            },
            drawerIcon: function (_a) {
                var size = _a.size, color = _a.color, focused = _a.focused;
                return (<Ionicons_1.default name="document-text-outline" size={size} color={focused ? color : fg}/>);
            },
        }}/>
      <drawer_1.Drawer.Screen name="settings" options={{
            headerTitle: "Configurações",
            drawerLabel: function (_a) {
                var color = _a.color, focused = _a.focused;
                return (<primitives_1.Text style={{ color: focused ? color : fg }}>Configurações</primitives_1.Text>);
            },
            drawerIcon: function (_a) {
                var size = _a.size, color = _a.color, focused = _a.focused;
                return (<Ionicons_1.default name="settings-outline" size={size} color={focused ? color : fg}/>);
            },
        }}/>
      <drawer_1.Drawer.Screen name="(tabs)" options={{
            headerTitle: "Tabs",
            drawerLabel: function (_a) {
                var color = _a.color, focused = _a.focused;
                return (<primitives_1.Text style={{ color: focused ? color : fg }}>Tabs</primitives_1.Text>);
            },
            drawerIcon: function (_a) {
                var size = _a.size, color = _a.color, focused = _a.focused;
                return (<MaterialIcons_1.default name="border-bottom" size={size} color={focused ? color : fg}/>);
            },
            headerRight: function () { return (<expo_router_1.Link href="/modal" asChild>
              <primitives_1.Pressable className="mr-4">
                <Ionicons_1.default name="add-outline" size={24} color={fg}/>
              </primitives_1.Pressable>
            </expo_router_1.Link>); },
        }}/>
    </drawer_1.Drawer>);
}
exports.default = DrawerLayout;
