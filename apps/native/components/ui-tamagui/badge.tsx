import type { ComponentProps } from "react";
import { styled, Text } from "tamagui";

const StyledBadge = styled(Text, {
  paddingHorizontal: "$2",
  paddingVertical: "$1",
  borderRadius: "$2",
  fontSize: 12,
  fontWeight: "500",
  variants: {
    variant: {
      default: { backgroundColor: "$muted", color: "$foreground" },
      success: { backgroundColor: "rgba(16,185,129,0.2)", color: "$success" },
      warning: { backgroundColor: "rgba(245,158,11,0.2)", color: "$warning" },
      danger: { backgroundColor: "rgba(239,68,68,0.2)", color: "$danger" },
    },
  } as const,
  defaultVariants: { variant: "default" },
});

type Props = ComponentProps<typeof StyledBadge> & {
  variant?: "default" | "success" | "warning" | "danger";
};

export function Badge({ variant = "default", ...props }: Props) {
  return <StyledBadge variant={variant} {...props} />;
}
