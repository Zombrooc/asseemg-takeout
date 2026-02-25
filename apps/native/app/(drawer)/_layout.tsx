import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";

import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { Text } from "@/lib/primitives";
import { useEventsListRealtime } from "@/lib/takeout-realtime";
import { safeThemeColor } from "@/utils/theme-colors";

function DrawerLayout() {
	const { baseUrl, deviceId } = useTakeoutConnection();
	useEventsListRealtime(baseUrl, deviceId);

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
					headerShown: false,
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
				name="audit"
				options={{
					headerShown: false,
					drawerLabel: ({ color, focused }) => (
						<Text style={{ color: focused ? color : fg }}>Auditoria</Text>
					),
					drawerIcon: ({ size, color, focused }) => (
						<MaterialIcons
							name="fact-check"
							size={size}
							color={focused ? color : fg}
						/>
					),
				}}
			/>
			<Drawer.Screen
				name="settings"
				options={{
					headerShown: false,
					drawerLabel: ({ color, focused }) => (
						<Text style={{ color: focused ? color : fg }}>Configurações</Text>
					),
					drawerIcon: ({ size, color, focused }) => (
						<Ionicons
							name="settings-outline"
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
					drawerItemStyle: { display: "none" },
					headerShown: false,
				}}
			/>
		</Drawer>
	);
}

export default DrawerLayout;
