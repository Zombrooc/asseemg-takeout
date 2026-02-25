import type { ComponentProps } from "react";
import { Input as TamaguiInput, styled } from "tamagui";

const StyledInput = styled(TamaguiInput, {
  backgroundColor: "$background",
  borderWidth: 1,
  borderColor: "$border",
  borderRadius: "$3",
  paddingHorizontal: "$3",
  paddingVertical: "$2",
  color: "$foreground",
  placeholderTextColor: "$textTertiary",
});

type Props = ComponentProps<typeof StyledInput>;

export function Input(props: Props) {
  return <StyledInput {...props} />;
}
