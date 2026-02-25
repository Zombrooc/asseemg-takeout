import { cn } from "heroui-native";
import type { ComponentProps } from "react";

import { Card } from "@/components/ui/card";

export function Banner({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      variant="tertiary"
      className={cn("p-3 rounded-xl border border-border bg-card", className)}
      {...props}
    />
  );
}
