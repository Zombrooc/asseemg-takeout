import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Text, View } from "@/lib/primitives";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  cta?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, description, cta }: Props) {
  return (
    <View className="py-10 px-4 items-center justify-center min-h-[200px]">
      {icon ? (
        <View className="mb-4 w-12 h-12 items-center justify-center rounded-full bg-muted/20">
          {icon}
        </View>
      ) : null}
      <Text className="text-foreground font-semibold text-center text-base leading-tight">
        {title}
      </Text>
      {description ? (
        <Text className="text-muted-foreground text-sm text-center mt-2 max-w-[280px] leading-relaxed">
          {description}
        </Text>
      ) : null}
      {cta ? (
        <Button
          className="mt-6 px-4 py-3 rounded-xl min-h-[44px]"
          onPress={cta.onPress}
        >
          {cta.label}
        </Button>
      ) : null}
    </View>
  );
}
