"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservedNumbersCollapsible = ReservedNumbersCollapsible;
var lucide_react_1 = require("lucide-react");
var collapsible_1 = require("@/components/ui/collapsible");
function ReservedNumbersCollapsible(_a) {
    var reservedNumbers = _a.reservedNumbers, isOpen = _a.isOpen, onOpenChange = _a.onOpenChange;
    if (reservedNumbers.length === 0) {
        return (<p className="text-sm text-muted-foreground">
        Nenhuma reserva disponível. Adicione uma faixa para liberar números.
      </p>);
    }
    return (<collapsible_1.Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <collapsible_1.CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-muted/50">
        {isOpen ? "Ocultar números reservados" : "Ver n\u00FAmeros reservados (".concat(reservedNumbers.length, ")")}
        <lucide_react_1.ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" aria-hidden/>
      </collapsible_1.CollapsibleTrigger>
      <collapsible_1.CollapsibleContent className="mt-3">
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Número</th>
                <th className="px-3 py-2 font-medium">Etiqueta</th>
              </tr>
            </thead>
            <tbody>
              {reservedNumbers.map(function (item) {
            var _a;
            return (<tr key={item.bibNumber} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono">#{item.bibNumber}</td>
                  <td className="px-3 py-2">{(_a = item.label) !== null && _a !== void 0 ? _a : "-"}</td>
                </tr>);
        })}
            </tbody>
          </table>
        </div>
      </collapsible_1.CollapsibleContent>
    </collapsible_1.Collapsible>);
}
