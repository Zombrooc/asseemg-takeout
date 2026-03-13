import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { LegacyReservedNumber } from "@/lib/takeout-api";

type ReservedNumbersCollapsibleProps = {
  reservedNumbers: LegacyReservedNumber[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReservedNumbersCollapsible({
  reservedNumbers,
  isOpen,
  onOpenChange,
}: ReservedNumbersCollapsibleProps) {
  if (reservedNumbers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma reserva disponível. Adicione uma faixa para liberar números.
      </p>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-muted/50">
        {isOpen ? "Ocultar números reservados" : `Ver números reservados (${reservedNumbers.length})`}
        <ChevronDown
          className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Número</th>
                <th className="px-3 py-2 font-medium">Etiqueta</th>
              </tr>
            </thead>
            <tbody>
              {reservedNumbers.map((item) => (
                <tr key={item.bibNumber} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono">#{item.bibNumber}</td>
                  <td className="px-3 py-2">{item.label ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

