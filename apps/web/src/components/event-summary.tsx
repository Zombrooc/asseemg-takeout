import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Users } from "lucide-react";

export interface EventSummaryProps {
  totalParticipants: number;
  confirmedCount: number;
  pendingCount: number;
  rateBaseTotal?: number;
}

export function EventSummary({
  totalParticipants,
  confirmedCount,
  pendingCount,
  rateBaseTotal,
}: EventSummaryProps) {
  const rateTotal = rateBaseTotal ?? totalParticipants;
  const rate =
    rateTotal > 0
      ? Math.round((confirmedCount / rateTotal) * 100)
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-3 pt-4">
          <Users className="size-8 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-2xl font-bold">{totalParticipants}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 pt-4">
          <CheckCircle className="size-8 text-green-600 dark:text-green-400" aria-hidden />
          <div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {confirmedCount}
            </p>
            <p className="text-sm text-muted-foreground">Confirmados</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 pt-4">
          <Clock className="size-8 text-yellow-600 dark:text-yellow-400" aria-hidden />
          <div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {pendingCount}
            </p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col justify-center pt-4">
          <p className="text-2xl font-bold">{rate}%</p>
          <p className="text-sm text-muted-foreground">Taxa de confirmacao</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${rate}%` }}
              role="progressbar"
              aria-valuenow={rate}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
