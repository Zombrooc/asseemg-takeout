import { Button } from "@/components/ui";
import { View } from "@/lib/primitives";

export type PairingMethod = "qr" | "manual";

export function PairingMethodTabs({
  method,
  onChange,
}: {
  method: PairingMethod;
  onChange: (method: PairingMethod) => void;
}) {
  return (
    <View className="flex-row gap-2 mb-4">
      <Button
        variant={method === "qr" ? "solid" : "bordered"}
        className="px-4 py-3"
        onPress={() => onChange("qr")}
      >
        QR code
      </Button>
      <Button
        variant={method === "manual" ? "solid" : "bordered"}
        className="px-4 py-3"
        onPress={() => onChange("manual")}
      >
        Manual
      </Button>
    </View>
  );
}
