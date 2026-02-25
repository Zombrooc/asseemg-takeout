import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Filter, Search, X } from "lucide-react";

export interface AuditFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onClear?: () => void;
}

export function AuditFilters({
  statusFilter,
  onStatusChange,
  searchQuery = "",
  onSearchChange,
  onClear,
}: AuditFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Filtros</span>
      </div>
      <select
        className={cn(
          "h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        )}
        value={statusFilter || ""}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filtrar por status"
      >
        <option value="">Todos</option>
        <option value="CONFIRMED">Confirmado</option>
        <option value="DUPLICATE">Duplicado</option>
        <option value="FAILED">Falho</option>
      </select>
      {onSearchChange != null && (
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Buscar por ticket ou dispositivo..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
            aria-label="Buscar"
          />
        </div>
      )}
      {onClear != null && (
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Limpar filtros">
          <X className="size-4" aria-hidden />
          Limpar
        </Button>
      )}
    </div>
  );
}
