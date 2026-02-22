import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAudit,
  type AuditEvent,
  type AuditParams,
} from "@/lib/takeout-api";

function StatusBadge({ status }: { status: AuditEvent["status"] }) {
  const variant =
    status === "CONFIRMED"
      ? "default"
      : status === "DUPLICATE"
        ? "secondary"
        : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

export function AuditPage() {
  const [statusFilter, setStatusFilter] = useState<AuditParams["status"]>("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["takeout", "audit", statusFilter],
    queryFn: () => getAudit(statusFilter ? { status: statusFilter } : undefined),
  });

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">Auditoria</h1>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span>Status:</span>
          <select
            className="rounded border bg-background px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as AuditParams["status"] | "" || undefined,
              )
            }
          >
            <option value="">Todos</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="DUPLICATE">DUPLICATE</option>
            <option value="FAILED">FAILED</option>
          </select>
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>request_id</TableHead>
              <TableHead>ticket_id</TableHead>
              <TableHead>device_id</TableHead>
              <TableHead>status</TableHead>
              <TableHead>created_at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum evento
                </TableCell>
              </TableRow>
            ) : (
              events.map((ev) => (
                <TableRow key={ev.request_id}>
                  <TableCell className="font-mono text-xs">
                    {ev.request_id.slice(0, 8)}…
                  </TableCell>
                  <TableCell>{ev.ticket_id}</TableCell>
                  <TableCell>{ev.device_id}</TableCell>
                  <TableCell>
                    <StatusBadge status={ev.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(ev.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
