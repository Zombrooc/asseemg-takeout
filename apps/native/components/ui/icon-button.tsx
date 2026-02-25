import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

export function IconButton(props: ComponentProps<typeof Button>) {
  return <Button size="sm" variant="light" {...props} />;
}
