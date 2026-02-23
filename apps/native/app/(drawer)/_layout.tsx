import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";
import React from "react";

import { safeThemeColor } from "@/utils/theme-colors";
import { Pressable, Text } from "@/lib/primitives";

function DrawerLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");
  const fg = safeThemeColor(themeColorForeground, "#000000");
  const bg = safeThemeColor(themeColorBackground, "#ffffff");

  return (
    <Drawer
      screenOptions={{
        headerTintColor: fg,
        headerStyle: { backgroundColor: bg },
        headerTitleStyle: {
          fontWeight: "600",
          color: fg,
        },
        drawerStyle: { backgroundColor: bg },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "ASSEEMG Retira - Mobile",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : fg }}>Home</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={focused ? color : fg}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="events/[eventId]"
        options={{
          headerTitle: "Evento",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "Tabs",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : fg }}>Tabs</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <MaterialIcons
              name="border-bottom"
              size={size}
              color={focused ? color : fg}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable className="mr-4">
                <Ionicons name="add-outline" size={24} color={fg} />
              </Pressable>
            </Link>
          ),
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
