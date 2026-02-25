import { Chip } from "@/components/ui";
import { View } from "@/lib/primitives";

/** Alinhado a GET /audit (status: CONFIRMED | DUPLICATE | FAILED) */
const OPTIONS = ["ALL", "CONFIRMED", "DUPLICATE", "FAILED"] as const;

type StatusFilter = (typeof OPTIONS)[number];

export function AuditFilters({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <Chip
          key={option}
          testID={`audit-filters-${option.toLowerCase()}`}
          color={value === option ? "primary" : "secondary"}
          onPress={() => onChange(option)}
        >
          <Chip.Label>{option}</Chip.Label>
        </Chip>
      ))}
    </View>
  );
}
