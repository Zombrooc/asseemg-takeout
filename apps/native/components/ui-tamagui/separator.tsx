import type { ComponentProps } from "react";
import { Separator as TamaguiSeparator } from "tamagui";

type Props = ComponentProps<typeof TamaguiSeparator>;

export function Separator(props: Props) {
  return <TamaguiSeparator borderColor="$border" {...props} />;
}
