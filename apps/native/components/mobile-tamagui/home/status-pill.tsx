import { View } from "react-native";
import { Badge } from "@/components/ui-tamagui";

export function StatusPill({ isReachable }: { isReachable: boolean }) {
  return (
    <View style={{ flexShrink: 0 }}>
      <Badge variant={isReachable ? "success" : "danger"}>
        {isReachable ? "Ao vivo" : "OFFLINE"}
      </Badge>
    </View>
  );
}
