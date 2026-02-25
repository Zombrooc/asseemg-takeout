import type { ComponentProps } from "react";
import { Spinner as TamaguiSpinner } from "tamagui";

type Props = ComponentProps<typeof TamaguiSpinner>;

export function Spinner(props: Props) {
  return <TamaguiSpinner color="$accent" {...props} />;
}
