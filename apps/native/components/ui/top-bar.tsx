import { cn } from "heroui-native";
import type { PropsWithChildren, ReactNode } from "react";

import { Text, View } from "@/lib/primitives";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  actionSlot?: ReactNode;
  className?: string;
}>;

export function TopBar({
  title,
  subtitle,
  rightSlot,
  actionSlot,
  className,
  children,
}: Props) {
  return (
    <View
      className={cn(
        "px-4 pt-2 pb-3 border-b border-border bg-background",
        className,
      )}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 min-w-0 shrink">
          <Text
            className="text-lg font-semibold text-foreground leading-tight"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="text-muted-foreground text-sm mt-0.5 leading-snug"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2 shrink-0">
          {actionSlot}
          {rightSlot}
        </View>
      </View>
      {children}
    </View>
  );
}
