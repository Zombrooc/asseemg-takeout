import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AuditFilters } from "@/components/audit-filters";
import { AuditLogTable } from "@/components/audit-log-table";
import { buildAuditCsv, parseAuditRetirantePayload } from "@/lib/audit-utils";
import { getAudit, getEvents, type AuditParams } from "@/lib/takeout-api";

export function AuditPage() {
  const [statusFilter, setStatusFilter] = useState<AuditParams["status"]>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");

  const { data: events = [] } = useQuery({
    queryKey: ["takeout", "events", "audit-selector"],
    queryFn: () => getEvents(true),
  });

  const effectiveEventId = selectedEventId || events[0]?.eventId || "";

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["takeout", "audit", effectiveEventId, statusFilter],
    queryFn: () =>
      getAudit({
        eventId: effectiveEventId,
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
    enabled: !!effectiveEventId,
  });

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const retirada = parseAuditRetirantePayload(log.payload_json);
      return (
        log.ticket_id.toLowerCase().includes(q) ||
        log.device_id.toLowerCase().includes(q) ||
        log.request_id.toLowerCase().includes(q) ||
        log.status.toLowerCase().includes(q) ||
        (log.participant_name?.toLowerCase().includes(q) ?? false) ||
        (log.ticket_name?.toLowerCase().includes(q) ?? false) ||
        (log.operator_alias?.toLowerCase().includes(q) ?? false) ||
        (retirada.retiranteNome?.toLowerCase().includes(q) ?? false) ||
        (retirada.retiranteCpf?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [logs, searchQuery]);

  const handleClearFilters = () => {
    setStatusFilter("");
    setSearchQuery("");
  };

  const handleExport = () => {
    const blob = new Blob([buildAuditCsv(filteredLogs)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">Auditoria</h1>

      <div className="max-w-md space-y-2">
        <label htmlFor="event-audit-filter" className="text-sm font-medium">
          Evento
        </label>
        <select
          id="event-audit-filter"
          aria-label="Selecionar evento da auditoria"
          value={effectiveEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="h-10 w-full rounded-md border bg-background px-3"
        >
          {events.map((event) => (
            <option key={event.eventId} value={event.eventId}>
              {event.name ?? event.eventId}
            </option>
          ))}
        </select>
      </div>

      <AuditFilters
        statusFilter={statusFilter ?? ""}
        onStatusChange={(v) => setStatusFilter((v as AuditParams["status"]) || undefined)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClear={handleClearFilters}
      />

      <AuditLogTable
        logs={filteredLogs}
        isLoading={isLoading}
        onExport={handleExport}
      />
    </main>
  );
}
