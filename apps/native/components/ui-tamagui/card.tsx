import type { ComponentProps } from "react";
import { styled, YStack } from "tamagui";

const StyledCard = styled(YStack, {
  backgroundColor: "$card",
  borderRadius: "$4",
  padding: "$4",
  borderWidth: 1,
  borderColor: "$border",
});

type Props = ComponentProps<typeof StyledCard>;

export function Card(props: Props) {
  return <StyledCard {...props} />;
}
