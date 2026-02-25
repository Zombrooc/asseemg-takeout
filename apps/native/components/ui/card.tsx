import { Surface, cn } from "heroui-native";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Surface>;

export function Card({ className, variant = "secondary", ...props }: Props) {
  return <Surface variant={variant} className={cn("p-4 rounded-2xl", className)} {...props} />;
}
