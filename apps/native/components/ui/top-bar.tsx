import { cn } from "heroui-native";
import type { PropsWithChildren, ReactNode } from "react";

import { Text, View } from "@/lib/primitives";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  className?: string;
}>;

export function TopBar({ title, subtitle, rightSlot, className, children }: Props) {
  return (
    <View className={cn("px-4 pt-2 pb-3 border-b border-border", className)}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">{title}</Text>
          {subtitle ? (
            <Text className="text-muted-foreground text-sm mt-0.5">{subtitle}</Text>
          ) : null}
        </View>
        {rightSlot}
      </View>
      {children}
    </View>
  );
}
