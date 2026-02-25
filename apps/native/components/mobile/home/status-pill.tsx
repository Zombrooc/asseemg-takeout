import { Chip } from "@/components/ui";
import { View } from "@/lib/primitives";

export function StatusPill({ isReachable }: { isReachable: boolean }) {
  return (
    <View className="shrink-0">
      <Chip color={isReachable ? "success" : "danger"} size="sm">
        <Chip.Label>{isReachable ? "LIVE" : "OFFLINE"}</Chip.Label>
      </Chip>
    </View>
  );
}
