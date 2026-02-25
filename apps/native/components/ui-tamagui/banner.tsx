import type { ComponentProps } from "react";
import { styled, YStack } from "tamagui";

const BannerFrame = styled(YStack, {
  padding: "$3",
  borderRadius: "$3",
  borderWidth: 1,
  variants: {
    variant: {
      info: { backgroundColor: "$accentLight", borderColor: "$accent" },
      warn: { backgroundColor: "rgba(245,158,11,0.15)", borderColor: "$warning" },
      error: { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "$danger" },
      success: { backgroundColor: "rgba(16,185,129,0.15)", borderColor: "$success" },
    },
  } as const,
  defaultVariants: { variant: "info" },
});

type Props = ComponentProps<typeof BannerFrame> & {
  variant?: "info" | "warn" | "error" | "success";
};

export function Banner({ variant = "info", ...props }: Props) {
  return <BannerFrame variant={variant} {...props} />;
}
