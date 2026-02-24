import "@/global.css";
import { Uniwind } from "uniwind";

// Garantir tema antes de qualquer componente usar useThemeColor/useCSSVariable
Uniwind.setTheme("light");

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { TakeoutConnectionProvider } from "@/contexts/takeout-connection-context";
import { TakeoutQueueProcessor } from "@/components/takeout/queue-processor";
import { queryClient } from "@/utils/trpc";

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

function StackLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="pair" options={{ title: "Parear" }} />
      <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <AppThemeProvider>
              <TakeoutConnectionProvider>
                <TakeoutQueueProcessor />
                <HeroUINativeProvider>
                  <StackLayout />
                </HeroUINativeProvider>
              </TakeoutConnectionProvider>
            </AppThemeProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
