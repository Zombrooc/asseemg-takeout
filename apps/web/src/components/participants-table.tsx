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
  if (cpf == null || cpf === "") return "-";
  const digits = cpf.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export interface ParticipantsTableProps {
  eventName: string;
  participants: EventParticipant[];
  onConfirm?: (participant: EventParticipant) => void;
  onUndo?: (participant: EventParticipant) => void;
  onEdit?: (participant: EventParticipant) => void;
  isConfirming?: boolean;
  isUndoing?: boolean;
  isEditing?: boolean;
  showQrColumn?: boolean;
}

export function resolveDisplayTicket(participant: EventParticipant): string {
  const ticketName = participant.ticketName?.trim();
  const sourceTicketId = participant.sourceTicketId?.trim();
  if (ticketName) {
    if (sourceTicketId && !sourceTicketId.startsWith("#")) {
      return `${sourceTicketId} - ${ticketName}`;
    }
    return ticketName;
  }
  return sourceTicketId || participant.ticketId || "-";
}

export function ParticipantsTable({
  eventName,
  participants,
  onConfirm,
  onUndo,
  onEdit,
  isConfirming = false,
  isUndoing = false,
  isEditing = false,
  showQrColumn = false,
}: ParticipantsTableProps) {
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
              <TableHead scope="col" className="w-[155px]">
                Acao
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showQrColumn ? 6 : 5} className="py-8 text-center text-muted-foreground">
                  Nenhum participante encontrado.
                </TableCell>
              </TableRow>
            ) : (
              participants.map((p) => (
                <TableRow
                  key={p.id}
                  className={cn(p.checkinDone && "bg-green-50/50 dark:bg-green-950/20")}
                >
                  <TableCell className="whitespace-normal">{p.name ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{formatCpf(p.cpf)}</TableCell>
                  <TableCell className="whitespace-normal">{resolveDisplayTicket(p)}</TableCell>
                  {showQrColumn && (
                    <TableCell>
                      {p.qrCode ? (
                        <QRCodeSVG value={p.qrCode} size={QR_SIZE} level="M" aria-label="QR do ingresso" />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <StatusBadge status={p.checkinDone ? "confirmed" : "pending"} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!p.checkinDone && onEdit != null && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isEditing}
                          onClick={() => onEdit(p)}
                        >
                          {isEditing ? "..." : "Editar"}
                        </Button>
                      )}
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
                      {p.checkinDone && onUndo != null && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUndoing}
                          onClick={() => onUndo(p)}
                        >
                          {isUndoing ? "..." : "Desfazer"}
                        </Button>
                      )}
                    </div>
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
