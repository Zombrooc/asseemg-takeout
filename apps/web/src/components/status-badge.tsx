import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

export interface StatusBadgeProps {
  status: "confirmed" | "pending" | "duplicate" | "failed" | "reversed";
  label?: string;
}

const statusConfig = {
  confirmed: {
    bgColor: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle,
    defaultLabel: "Confirmado",
  },
  pending: {
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    textColor: "text-yellow-700 dark:text-yellow-400",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: AlertCircle,
    defaultLabel: "Pendente",
  },
  duplicate: {
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    textColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: AlertCircle,
    defaultLabel: "Duplicado",
  },
  failed: {
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
    icon: XCircle,
    defaultLabel: "Falho",
  },
  reversed: {
    bgColor: "bg-slate-50 dark:bg-slate-950/30",
    textColor: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-200 dark:border-slate-800",
    icon: XCircle,
    defaultLabel: "Desfeito",
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        config.bgColor,
        config.textColor,
        config.borderColor,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label ?? config.defaultLabel}
    </span>
  );
}
