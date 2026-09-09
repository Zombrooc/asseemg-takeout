"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unstable_settings = void 0;
exports.default = Layout;
require("@/global.css");
var uniwind_1 = require("uniwind");
// Garantir tema antes de qualquer componente usar useThemeColor/useCSSVariable
uniwind_1.Uniwind.setTheme("light");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var heroui_native_1 = require("heroui-native");
var react_native_gesture_handler_1 = require("react-native-gesture-handler");
var react_native_keyboard_controller_1 = require("react-native-keyboard-controller");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var app_theme_context_1 = require("@/contexts/app-theme-context");
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var queue_processor_1 = require("@/components/takeout/queue-processor");
var trpc_1 = require("@/utils/trpc");
var tamagui_1 = require("tamagui");
var tamagui_config_1 = require("../tamagui.config");
exports.unstable_settings = {
    initialRouteName: "(drawer)",
};
function StackLayout() {
    return (<expo_router_1.Stack screenOptions={{}}>
      <expo_router_1.Stack.Screen name="(drawer)" options={{ headerShown: false }}/>
      <expo_router_1.Stack.Screen name="pair" options={{ title: "Parear" }}/>
      <expo_router_1.Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }}/>
    </expo_router_1.Stack>);
}
function Layout() {
    return (<react_query_1.QueryClientProvider client={trpc_1.queryClient}>
      <react_native_gesture_handler_1.GestureHandlerRootView style={{ flex: 1 }}>
        <react_native_safe_area_context_1.SafeAreaProvider>
          <react_native_keyboard_controller_1.KeyboardProvider>
            <app_theme_context_1.AppThemeProvider>
              <takeout_connection_context_1.TakeoutConnectionProvider>
                <queue_processor_1.TakeoutQueueProcessor />
                <heroui_native_1.HeroUINativeProvider>
                  <tamagui_1.TamaguiProvider config={tamagui_config_1.config} defaultTheme="light">
                    <StackLayout />
                  </tamagui_1.TamaguiProvider>
                </heroui_native_1.HeroUINativeProvider>
              </takeout_connection_context_1.TakeoutConnectionProvider>
            </app_theme_context_1.AppThemeProvider>
          </react_native_keyboard_controller_1.KeyboardProvider>
        </react_native_safe_area_context_1.SafeAreaProvider>
      </react_native_gesture_handler_1.GestureHandlerRootView>
    </react_query_1.QueryClientProvider>);
}
