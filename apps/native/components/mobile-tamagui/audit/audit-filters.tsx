import { Pressable } from "react-native";
import { Text, XStack } from "tamagui";

const OPTIONS = ["ALL", "CONFIRMED", "DUPLICATE", "FAILED"] as const;

export type StatusFilter = (typeof OPTIONS)[number];

export function AuditFilters({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  return (
    <XStack flexDirection="row" flexWrap="wrap" gap="$2">
      {OPTIONS.map((option) => {
        const isActive = value === option;
        return (
          <Pressable
            key={option}
            testID={`audit-filters-${option.toLowerCase()}`}
            onPress={() => onChange(option)}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: isActive ? "#2563eb" : "rgba(156,163,175,0.2)",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text
              fontSize={12}
              fontWeight="500"
              color={isActive ? "white" : "$foreground"}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </XStack>
  );
}
