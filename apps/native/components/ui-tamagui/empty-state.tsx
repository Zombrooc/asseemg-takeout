import type { ReactNode } from "react";
import { Text, YStack } from "tamagui";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" gap="$3">
      {icon}
      <Text color="$foreground" fontWeight="600" fontSize={16}>
        {title}
      </Text>
      {description ? (
        <Text color="$textSecondary" textAlign="center" fontSize={14}>
          {description}
        </Text>
      ) : null}
      {action}
    </YStack>
  );
}
