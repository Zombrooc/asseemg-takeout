import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";
import type { ReactNode } from "react";

export interface StatusCardProps {
  title: string;
  status: "connected" | "disconnected" | "pending";
  value: string;
  icon?: ReactNode;
  description?: string;
}

const statusConfig = {
  connected: {
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    textColor: "text-green-700 dark:text-green-400",
    indicatorColor: "#10b981",
    label: "Conectado",
  },
  disconnected: {
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    textColor: "text-red-700 dark:text-red-400",
    indicatorColor: "#ef4444",
    label: "Desconectado",
  },
  pending: {
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    textColor: "text-yellow-700 dark:text-yellow-400",
    indicatorColor: "#f59e0b",
    label: "Verificando",
  },
};

export function StatusCard({
  title,
  status,
  value,
  icon,
  description,
}: StatusCardProps) {
  const config = statusConfig[status];

  return (
    <Card
      className={cn(
        "border",
        config.borderColor,
        config.bgColor,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {icon ?? (
            <Circle
              className="size-5 shrink-0"
              style={{ color: config.indicatorColor }}
              aria-hidden
            />
          )}
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            config.bgColor,
            config.textColor,
            config.borderColor,
            "border",
          )}
        >
          {config.label}
        </span>
      </CardHeader>
      <CardContent>
        <p className={cn("text-lg font-medium", config.textColor)}>{value}</p>
        {description != null && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
