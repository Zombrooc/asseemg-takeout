import type { ComponentProps } from "react";
import { Button as TamaguiButton, Spinner, styled } from "tamagui";

const StyledButton = styled(TamaguiButton, {
  backgroundColor: "$accent",
  color: "white",
  borderRadius: "$4",
  paddingHorizontal: "$4",
  paddingVertical: "$3",
  pressStyle: { opacity: 0.9 },
  variants: {
    variant: {
      primary: { backgroundColor: "$accent", color: "white" },
      secondary: { backgroundColor: "$card", borderWidth: 1, borderColor: "$border", color: "$foreground" },
      bordered: { backgroundColor: "$card", borderWidth: 1, borderColor: "$border", color: "$foreground" },
      outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "$border", color: "$accent" },
      ghost: { backgroundColor: "transparent", color: "$textSecondary" },
      danger: { backgroundColor: "$danger", color: "white" },
    },
    disabled: { true: { opacity: 0.5 } },
  } as const,
  defaultVariants: { variant: "primary", disabled: false },
});

type Props = ComponentProps<typeof StyledButton> & {
  loading?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  testID?: string;
};

export function Button({
  loading,
  isLoading,
  isDisabled,
  children,
  disabled,
  testID,
  ...props
}: Props) {
  const busy = loading ?? isLoading;
  const isDisabledState = disabled ?? isDisabled;
  return (
    <StyledButton disabled={isDisabledState || busy} testID={testID} {...props}>
      {busy ? <Spinner color="white" size="small" /> : children}
    </StyledButton>
  );
}
