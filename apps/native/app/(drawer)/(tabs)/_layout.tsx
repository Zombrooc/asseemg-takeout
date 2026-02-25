import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";

import { safeThemeColor } from "@/utils/theme-colors";

export default function TabLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");
  const fg = safeThemeColor(themeColorForeground, "#000000");
  const bg = safeThemeColor(themeColorBackground, "#ffffff");

  return (
    <Tabs
      screenOptions={{
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
