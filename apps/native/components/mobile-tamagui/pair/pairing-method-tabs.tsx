import { Pressable, Text, View } from "react-native";

export type PairingMethod = "qr" | "manual";

const TABS: { value: PairingMethod; label: string }[] = [
  { value: "qr", label: "QR Code" },
  { value: "manual", label: "Manual" },
];

export function PairingMethodTabs({
  method,
  onChange,
}: {
  method: PairingMethod;
  onChange: (method: PairingMethod) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
      {TABS.map((tab) => {
        const isActive = method === tab.value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              {
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                minHeight: 44,
                borderRadius: 12,
                backgroundColor: isActive ? undefined : "rgba(156,163,175,0.1)",
                borderWidth: 1,
                borderColor: isActive ? undefined : "transparent",
                opacity: pressed ? 0.9 : 1,
              },
              isActive && {
                backgroundColor: "#f9fafb",
                borderColor: "#e5e7eb",
              },
            ]}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isActive ? "#6366f1" : "#6b7280",
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
