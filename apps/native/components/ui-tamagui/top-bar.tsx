import type { PropsWithChildren, ReactNode } from "react";
import { Text, XStack, YStack } from "tamagui";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  actionSlot?: ReactNode;
}>;

export function TopBar({
  title,
  subtitle,
  rightSlot,
  actionSlot,
  children,
}: Props) {
  return (
    <YStack
      paddingHorizontal="$4"
      paddingTop="$2"
      paddingBottom="$3"
      borderBottomWidth={1}
      borderColor="$border"
      backgroundColor="$background"
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <YStack flex={1} minWidth={0} flexShrink={1}>
          <Text
            fontSize={18}
            fontWeight="600"
            color="$foreground"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              color="$textSecondary"
              fontSize={14}
              marginTop="$0.5"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </YStack>
        <XStack alignItems="center" gap="$2" flexShrink={0}>
          {actionSlot}
          {rightSlot}
        </XStack>
      </XStack>
      {children}
    </YStack>
  );
}
