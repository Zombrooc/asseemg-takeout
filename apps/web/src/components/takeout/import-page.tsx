import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PullParticipant, PullResponse } from "@/lib/takeout-api";
import { postImportJson } from "@/lib/takeout-api";
import { toast } from "sonner";
import { FileJson, Info } from "lucide-react";

export function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<PullResponse | null>(null);
  const [participants, setParticipants] = useState<PullParticipant[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      if (!f.name.endsWith(".json") && f.type !== "application/json") {
        toast.error("Selecione um arquivo JSON");
        return;
      }
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
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
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
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">Importar JSON (checkin-sync)</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
            )}
            aria-label="Arraste um arquivo JSON ou clique para selecionar"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={onFileChange}
              aria-label="Selecionar JSON"
            />
            <FileJson className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">
              {file ? file.name : "Arraste um arquivo ou clique para selecionar"}
            </p>
            {file != null && (
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex gap-2 pt-4">
          <Info className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Requisitos do arquivo</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Formato JSON do checkin-sync (thevent)</li>
              <li>Campos obrigatórios: <code>eventId</code>, <code>participants</code></li>
              <li>Cada participante com <code>seatId</code>, <code>ticketId</code>, <code>participantName</code>, <code>cpf</code></li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {parsed != null && (
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending}
            className="w-full sm:w-auto"
          >
            {importMutation.isPending ? "Importando..." : "Importar e Salvar"}
          </Button>
        </div>
      )}

      {list.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview — Participantes ({list.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table role="table">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Nome</TableHead>
                    <TableHead scope="col">CPF</TableHead>
                    <TableHead scope="col">Ingresso</TableHead>
                    <TableHead scope="col">QR Code</TableHead>
                    <TableHead scope="col">Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((p) => (
                    <TableRow key={p.seatId}>
                      <TableCell>{p.participantName}</TableCell>
                      <TableCell className="font-mono text-xs">{p.cpf}</TableCell>
                      <TableCell>{p.ticketName}</TableCell>
                      <TableCell className="font-mono text-xs">{p.qrCode}</TableCell>
                      <TableCell>{p.checkinDone ? "Sim" : "Não"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
