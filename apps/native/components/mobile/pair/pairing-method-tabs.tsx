import { Pressable, Text, View } from "@/lib/primitives";

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
    <View className="flex-row gap-2 mb-4">
      {TABS.map((tab) => {
        const isActive = method === tab.value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            className={`flex-1 items-center justify-center py-2.5 rounded-xl min-h-[44px] border ${
              isActive
                ? "bg-card border-border"
                : "bg-muted/10 border-transparent"
            }`}
            style={
              isActive
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }
                : undefined
            }
          >
            <Text
              className={`text-sm font-semibold leading-tight ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
