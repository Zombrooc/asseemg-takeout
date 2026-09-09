"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditFilters = AuditFilters;
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function AuditFilters(_a) {
    var statusFilter = _a.statusFilter, onStatusChange = _a.onStatusChange, _b = _a.searchQuery, searchQuery = _b === void 0 ? "" : _b, onSearchChange = _a.onSearchChange, onClear = _a.onClear;
    return (<div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <lucide_react_1.Filter className="size-4 text-muted-foreground" aria-hidden/>
        <span className="text-sm font-medium">Filtros</span>
      </div>
      <select className={(0, utils_1.cn)("h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2")} value={statusFilter || ""} onChange={function (e) { return onStatusChange(e.target.value); }} aria-label="Filtrar por status">
        <option value="">Todos</option>
        <option value="CONFIRMED">Confirmado</option>
        <option value="DUPLICATE">Duplicado</option>
        <option value="FAILED">Falho</option>
        <option value="REVERSED">Desfeito</option>
      </select>
      {onSearchChange != null && (<div className="relative min-w-[200px] max-w-sm flex-1">
          <lucide_react_1.Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden/>
          <input_1.Input placeholder="Buscar por ticket ou dispositivo..." value={searchQuery} onChange={function (e) { return onSearchChange(e.target.value); }} className="pl-8" aria-label="Buscar"/>
        </div>)}
      {onClear != null && (<button_1.Button variant="ghost" size="sm" onClick={onClear} aria-label="Limpar filtros">
          <lucide_react_1.X className="size-4" aria-hidden/>
          Limpar
        </button_1.Button>)}
    </div>);
}
