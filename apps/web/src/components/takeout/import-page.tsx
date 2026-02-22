import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PullParticipant, PullResponse } from "@/lib/takeout-api";
import { postImportJson } from "@/lib/takeout-api";
import { toast } from "sonner";

export function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<PullResponse | null>(null);
  const [participants, setParticipants] = useState<PullParticipant[] | null>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParticipants(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const data = JSON.parse(text) as PullResponse;
        if (!data.eventId || !Array.isArray(data.participants)) {
          toast.error("JSON inválido: esperado eventId e participants");
          setParsed(null);
          return;
        }
        setParsed(data);
      } catch {
        toast.error("Arquivo não é um JSON válido");
        setParsed(null);
      }
    };
    reader.readAsText(f, "utf-8");
  }, []);

  const importMutation = useMutation({
    mutationFn: (data: PullResponse) => postImportJson(data),
    onSuccess: (res) => {
      toast.success(`${res.participants.length} participante(s) importado(s)`);
      setParticipants(res.participants);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erro ao importar"),
  });

  const handleImport = () => {
    if (!parsed) {
      toast.error("Selecione um arquivo JSON válido");
      return;
    }
    importMutation.mutate(parsed);
  };

  const list = participants ?? parsed?.participants ?? [];

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">Importar JSON (checkin-sync)</h1>

      <div className="flex flex-wrap items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onFileChange}
          aria-label="Selecionar JSON"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Selecionar arquivo
        </Button>
        {file && (
          <span className="text-sm text-muted-foreground">{file.name}</span>
        )}
      </div>

      {parsed && (
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? "Importando..." : "Importar e salvar no DB"}
          </Button>
        </div>
      )}

      {list.length > 0 && (
        <>
          <h2 className="text-lg font-medium">
            Participantes ({list.length})
          </h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Ingresso</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Check-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.seatId}>
                    <TableCell>{p.participantName}</TableCell>
                    <TableCell>{p.cpf}</TableCell>
                    <TableCell>{p.ticketName}</TableCell>
                    <TableCell className="font-mono text-xs">{p.qrCode}</TableCell>
                    <TableCell>{p.checkinDone ? "Sim" : "Não"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
