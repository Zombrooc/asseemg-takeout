import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTimeBR } from "@/lib/format-date";
import { parseAuditRetirantePayload } from "@/lib/audit-utils";
import type { AuditEvent } from "@/lib/takeout-api";
import { Download, RotateCw } from "lucide-react";

function auditStatusToBadge(status: AuditEvent["status"]): "confirmed" | "duplicate" | "failed" {
  switch (status) {
    case "CONFIRMED":
      return "confirmed";
    case "DUPLICATE":
      return "duplicate";
    case "FAILED":
      return "failed";
  }
}

export interface AuditLogTableProps {
  logs: AuditEvent[];
  isLoading?: boolean;
  onRetry?: (log: AuditEvent) => void;
  onExport?: () => void;
}

export function AuditLogTable({
  logs,
  isLoading = false,
  onRetry,
  onExport,
}: AuditLogTableProps) {
  return (
    <div className="space-y-4">
      {onExport != null && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onExport} aria-label="Exportar CSV">
            <Download className="size-4" aria-hidden />
            Exportar CSV
          </Button>
        </div>
      )}
      <div className="rounded-md border">
        <Table role="table">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Hora</TableHead>
              <TableHead scope="col">Ticket</TableHead>
              <TableHead scope="col">Dispositivo</TableHead>
              <TableHead scope="col">Tipo de retirada</TableHead>
              <TableHead scope="col">Retirante</TableHead>
              <TableHead scope="col">Status</TableHead>
              {onRetry != null && (
                <TableHead scope="col" className="w-[100px]" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={onRetry != null ? 7 : 6} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onRetry != null ? 7 : 6} className="text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const retirada = parseAuditRetirantePayload(log.payload_json);
                return (
                  <TableRow key={log.request_id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTimeBR(log.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ticket_id}</TableCell>
                    <TableCell className="text-sm">{log.device_id}</TableCell>
                    <TableCell className="text-sm">
                      {retirada.retiradaPorTerceiro ? "Terceiro" : "Titular"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {retirada.retiranteNome ?? "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={auditStatusToBadge(log.status)} />
                    </TableCell>
                    {onRetry != null && (
                      <TableCell>
                        {log.status === "FAILED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRetry(log)}
                            aria-label="Tentar novamente"
                          >
                            <RotateCw className="size-4" aria-hidden />
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
