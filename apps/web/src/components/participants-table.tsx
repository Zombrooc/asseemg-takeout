import { useState } from "react";
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
import { cn } from "@/lib/utils";
import type { EventParticipant } from "@/lib/takeout-api";
import { QRCodeSVG } from "qrcode.react";

const QR_SIZE = 160;

function formatCpf(cpf: string | null | undefined): string {
  if (cpf == null || cpf === "") return "—";
  const digits = cpf.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export interface ParticipantsTableProps {
  eventName: string;
  participants: EventParticipant[];
  onConfirm?: (participant: EventParticipant) => void;
  isConfirming?: boolean;
  /** Show QR code column (e.g. in dev) */
  showQrColumn?: boolean;
}

export function ParticipantsTable({
  eventName,
  participants,
  onConfirm,
  isConfirming = false,
  showQrColumn = false,
}: ParticipantsTableProps) {
  const [revealedQrId, setRevealedQrId] = useState<string | null>(null);
  const confirmedCount = participants.filter((p) => p.checkinDone).length;
  const pendingCount = participants.length - confirmedCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{eventName}</h2>
        <p className="text-sm text-muted-foreground">
          {confirmedCount} confirmados · {pendingCount} pendentes
        </p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Nome</TableHead>
              <TableHead scope="col">CPF</TableHead>
              <TableHead scope="col">Ingresso</TableHead>
              {showQrColumn && <TableHead scope="col">QR Code</TableHead>}
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="w-[140px]">
                Ação
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p) => (
              <TableRow
                key={p.id}
                className={cn(p.checkinDone && "bg-green-50/50 dark:bg-green-950/20")}
              >
                <TableCell>{p.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {formatCpf(p.cpf)}
                </TableCell>
                <TableCell>{p.sourceTicketId ?? p.ticketId}</TableCell>
                {showQrColumn && (
                  <TableCell>
                    {p.qrCode ? (
                      revealedQrId === p.id ? (
                        <button
                          type="button"
                          className="cursor-pointer border-0 bg-transparent p-0"
                          onClick={() => setRevealedQrId(null)}
                          title="Clique para ocultar"
                        >
                          <QRCodeSVG value={p.qrCode} size={QR_SIZE} level="M" aria-label="QR do ingresso" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex min-h-[160px] min-w-[160px] cursor-pointer items-center justify-center rounded border border-dashed border-muted-foreground/40 bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50"
                          onClick={() => setRevealedQrId(p.id)}
                        >
                          Clique para mostrar
                        </button>
                      )
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <StatusBadge status={p.checkinDone ? "confirmed" : "pending"} />
                </TableCell>
                <TableCell>
                  {!p.checkinDone && onConfirm != null && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isConfirming}
                      onClick={() => onConfirm(p)}
                    >
                      {isConfirming ? "..." : "Confirmar"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
