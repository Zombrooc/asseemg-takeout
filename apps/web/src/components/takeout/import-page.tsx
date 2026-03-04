import { useMutation } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  postImportJson,
  postImportLegacyCsv,
  type LegacyImportResponse,
  type PullParticipant,
  type PullResponse,
} from "@/lib/takeout-api";
import { cn } from "@/lib/utils";
import { FileJson, FileSpreadsheet, Info } from "lucide-react";
import { toast } from "sonner";

type ImportMode = "json_sync" | "legacy_csv";

type LegacyCsvParticipant = {
  number: string;
  fullName: string;
  sex: string;
  cpf: string;
  birthDate: string;
  modality: string;
  shirtSize: string;
  team: string;
};

const LEGACY_HEADERS = [
  "Número",
  "Nome Completo",
  "Sexo",
  "CPF",
  "Data de Nascimento",
  "Modalidade (5km, 10km, Caminhada ou Kids)",
  "Tamanho da Camisa",
  "Equipe",
] as const;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function parseLegacyCsv(content: string): LegacyCsvParticipant[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    throw new Error("CSV vazio");
  }
  const header = parseCsvLine(lines[0]);
  if (
    header.length !== LEGACY_HEADERS.length ||
    !LEGACY_HEADERS.every((expected, index) => header[index] === expected)
  ) {
    throw new Error("Header legado inválido");
  }
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      number: cols[0] ?? "",
      fullName: cols[1] ?? "",
      sex: cols[2] ?? "",
      cpf: cols[3] ?? "",
      birthDate: cols[4] ?? "",
      modality: cols[5] ?? "",
      shirtSize: cols[6] ?? "",
      team: cols[7] ?? "",
    };
  });
}

export function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("json_sync");
  const [file, setFile] = useState<File | null>(null);
  const [parsedJson, setParsedJson] = useState<PullResponse | null>(null);
  const [legacyRows, setLegacyRows] = useState<LegacyCsvParticipant[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [eventId, setEventId] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [legacyImportResult, setLegacyImportResult] = useState<LegacyImportResponse | null>(null);

  const resetParsedState = useCallback(() => {
    setParsedJson(null);
    setLegacyRows(null);
    setLegacyImportResult(null);
  }, []);

  const readFile = useCallback(
    (f: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result ?? "");
          if (mode === "json_sync") {
            const data = JSON.parse(text) as PullResponse;
            if (!data.eventId || !Array.isArray(data.participants)) {
              throw new Error("JSON inválido");
            }
            setParsedJson(data);
            setLegacyRows(null);
            return;
          }
          const rows = parseLegacyCsv(text);
          setLegacyRows(rows);
          setParsedJson(null);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Arquivo inválido");
          resetParsedState();
        }
      };
      reader.readAsText(f, "utf-8");
    },
    [mode, resetParsedState],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      resetParsedState();
      readFile(f);
    },
    [readFile, resetParsedState],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      const valid =
        mode === "json_sync"
          ? f.name.endsWith(".json") || f.type === "application/json"
          : f.name.endsWith(".csv") || f.type === "text/csv";
      if (!valid) {
        toast.error(mode === "json_sync" ? "Selecione um arquivo JSON" : "Selecione um arquivo CSV");
        return;
      }
      setFile(f);
      resetParsedState();
      readFile(f);
    },
    [mode, readFile, resetParsedState],
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      if (mode === "json_sync") {
        if (!parsedJson) throw new Error("Selecione um arquivo JSON válido");
        return postImportJson(parsedJson);
      }
      if (!file || !legacyRows) throw new Error("Selecione um arquivo CSV válido");
      if (!eventId.trim() || !eventName.trim() || !eventStartDate.trim()) {
        throw new Error("Preencha Event ID, Nome do evento e Data inicial");
      }
      const form = new FormData();
      form.append("eventId", eventId.trim());
      form.append("eventName", eventName.trim());
      form.append("eventStartDate", eventStartDate.trim());
      form.append("file", file);
      return postImportLegacyCsv(form);
    },
    onSuccess: (res) => {
      if (mode === "json_sync") {
        const payload = res as PullResponse;
        toast.success(`${payload.participants.length} participante(s) importado(s)`);
        setParsedJson(payload);
      } else {
        const payload = res as LegacyImportResponse;
        setLegacyImportResult(payload);
        toast.success(`${payload.imported} participante(s) legado(s) importado(s)`);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao importar"),
  });

  const listJson = parsedJson?.participants ?? [];
  const showImportButton = mode === "json_sync" ? parsedJson != null : legacyRows != null;
  const title = mode === "json_sync" ? "Importar JSON (checkin-sync)" : "Importar CSV legado";

  const accept = mode === "json_sync" ? ".json,application/json" : ".csv,text/csv";
  const icon = useMemo(
    () => (mode === "json_sync" ? <FileJson className="size-10 text-muted-foreground" aria-hidden /> : <FileSpreadsheet className="size-10 text-muted-foreground" aria-hidden />),
    [mode],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">{title}</h1>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <Label htmlFor="import-model">Modelo de importação</Label>
          <select
            id="import-model"
            aria-label="Modelo de importação"
            className="h-10 w-full rounded-md border bg-background px-3"
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as ImportMode);
              setFile(null);
              resetParsedState();
            }}
          >
            <option value="json_sync">JSON atual (.json)</option>
            <option value="legacy_csv">Sistema legado (.csv)</option>
          </select>
        </CardContent>
      </Card>

      {mode === "legacy_csv" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metadados do evento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="legacy-event-id">Event ID</Label>
              <Input id="legacy-event-id" aria-label="Event ID" value={eventId} onChange={(e) => setEventId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legacy-event-name">Nome do evento</Label>
              <Input
                id="legacy-event-name"
                aria-label="Nome do evento"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legacy-event-date">Data inicial</Label>
              <Input
                id="legacy-event-date"
                aria-label="Data inicial"
                type="date"
                value={eventStartDate}
                onChange={(e) => setEventStartDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

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
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            className={cn(
              "flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
            )}
            aria-label={mode === "json_sync" ? "Arraste um arquivo JSON ou clique para selecionar" : "Arraste um arquivo CSV ou clique para selecionar"}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={onFileChange}
              aria-label="Selecionar arquivo"
            />
            {icon}
            <p className="text-sm font-medium">
              {file ? file.name : "Arraste um arquivo ou clique para selecionar"}
            </p>
            {file != null ? (
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex gap-2 pt-4">
          <Info className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Requisitos do arquivo</p>
            {mode === "json_sync" ? (
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Formato JSON do checkin-sync (thevent)</li>
                <li>
                  Campos obrigatórios: <code>eventId</code>, <code>participants</code>
                </li>
                <li>
                  Cada participante com <code>seatId</code>, <code>ticketId</code>, <code>participantName</code>,{" "}
                  <code>cpf</code>
                </li>
              </ul>
            ) : (
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Formato CSV legado com header exato do sistema antigo</li>
                <li>Campos obrigatórios: Número, Nome Completo, CPF, Data de Nascimento</li>
                <li>Campos extras: Sexo, Modalidade, Tamanho da Camisa, Equipe</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {showImportButton ? (
        <div className="flex justify-end">
          <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="w-full sm:w-auto">
            {importMutation.isPending ? "Importando..." : "Importar e Salvar"}
          </Button>
        </div>
      ) : null}

      {mode === "json_sync" && listJson.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview — Participantes ({listJson.length})</CardTitle>
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
                  {listJson.map((p: PullParticipant) => (
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
      ) : null}

      {mode === "legacy_csv" && legacyRows != null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview — Participantes legado ({legacyRows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table role="table">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Número</TableHead>
                    <TableHead scope="col">Nome Completo</TableHead>
                    <TableHead scope="col">Sexo</TableHead>
                    <TableHead scope="col">CPF</TableHead>
                    <TableHead scope="col">Data de Nascimento</TableHead>
                    <TableHead scope="col">Modalidade</TableHead>
                    <TableHead scope="col">Tamanho da Camisa</TableHead>
                    <TableHead scope="col">Equipe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legacyRows.map((row, index) => (
                    <TableRow key={`${row.cpf}-${index}`}>
                      <TableCell>{row.number}</TableCell>
                      <TableCell>{row.fullName}</TableCell>
                      <TableCell>{row.sex || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.cpf}</TableCell>
                      <TableCell>{row.birthDate}</TableCell>
                      <TableCell>{row.modality || "-"}</TableCell>
                      <TableCell>{row.shirtSize || "-"}</TableCell>
                      <TableCell>{row.team || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {legacyImportResult ? (
              <p className="text-sm text-muted-foreground">
                Importados: {legacyImportResult.imported} | Erros: {legacyImportResult.errors.length}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
