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

type ParsedCsv = {
  headers: string[];
  rows: string[][];
  delimiter: "," | ";";
};

type LegacyFieldKey =
  | "number"
  | "fullName"
  | "cpf"
  | "birthDate"
  | "sex"
  | "modality"
  | "shirtSize"
  | "team";

type LegacyField = {
  key: LegacyFieldKey;
  label: string;
  required: boolean;
};

const LEGACY_FIELDS: LegacyField[] = [
  { key: "number", label: "Número", required: true },
  { key: "fullName", label: "Nome Completo", required: true },
  { key: "cpf", label: "CPF", required: true },
  { key: "birthDate", label: "Data de Nascimento", required: true },
  { key: "sex", label: "Sexo", required: false },
  { key: "modality", label: "Modalidade", required: false },
  { key: "shirtSize", label: "Tamanho da Camisa", required: false },
  { key: "team", label: "Equipe", required: false },
];

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

const MOJIBAKE_PATTERN = /[\u00C3\u00C2\uFFFD]/g;
const MAX_MOJIBAKE_REPAIR_PASSES = 3;

function mojibakeScore(value: string): number {
  return value.match(MOJIBAKE_PATTERN)?.length ?? 0;
}

function tryDecodeLatin1ishAsUtf8(value: string): string | null {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 0xff) {
      return null;
    }
    bytes[index] = code;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function repairMojibakeConservative(value: string): string {
  let current = value;
  for (let attempt = 0; attempt < MAX_MOJIBAKE_REPAIR_PASSES; attempt += 1) {
    const repaired = tryDecodeLatin1ishAsUtf8(current);
    if (!repaired || repaired === current) {
      break;
    }
    if (mojibakeScore(repaired) >= mojibakeScore(current)) {
      break;
    }
    current = repaired;
  }
  return current;
}

function sanitizeCsvValue(value: string): string {
  return repairMojibakeConservative(value).trim();
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function parseCsvLine(line: string, delimiter: "," | ";"): string[] {
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
    if (char === delimiter && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function detectDelimiter(headerLine: string): "," | ";" {
  const headerNoBom = headerLine.replace(/^\uFEFF/, "");
  const comma = parseCsvLine(headerNoBom, ",");
  const semicolon = parseCsvLine(headerNoBom, ";");
  if (semicolon.length > comma.length) return ";";
  if (comma.length > semicolon.length) return ",";
  if (headerNoBom.includes(";") && !headerNoBom.includes(",")) return ";";
  return ",";
}

function parseGenericCsv(content: string): ParsedCsv {
  const repairedContent = repairMojibakeConservative(content);
  const lines = repairedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    throw new Error("CSV vazio");
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0].replace(/^\uFEFF/, ""), delimiter).map(sanitizeCsvValue);
  const rows = lines
    .slice(1)
    .map((line) => parseCsvLine(line, delimiter).map(sanitizeCsvValue))
    .filter((row) => row.some((cell) => cell.length > 0));
  return { headers, rows, delimiter };
}

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

const LEGACY_FIELD_ALIASES: Record<LegacyFieldKey, string[]> = {
  number: ["numero", "número", "bib", "bib number", "bib_number", "numero atleta"],
  fullName: ["nome completo", "nome", "nome do participante", "participante", "name"],
  cpf: ["cpf", "documento", "documento cpf"],
  birthDate: ["data de nascimento", "nascimento", "birth date", "data_nascimento"],
  sex: ["sexo", "genero", "gênero", "gender"],
  modality: ["modalidade", "categoria", "prova", "race"],
  shirtSize: ["tamanho da camisa", "tamanho camisa", "camisa", "shirt size"],
  team: ["equipe", "time", "assessoria", "team"],
};

function autoMapHeaders(headers: string[]): Record<LegacyFieldKey, number | null> {
  const normalized = headers.map((header) => normalizeHeader(header));
  const taken = new Set<number>();
  const out = {} as Record<LegacyFieldKey, number | null>;

  for (const field of LEGACY_FIELDS) {
    const aliases = LEGACY_FIELD_ALIASES[field.key] ?? [];
    const aliasSet = new Set(aliases.map((alias) => normalizeHeader(alias)));
    let found: number | null = null;
    for (let idx = 0; idx < normalized.length; idx += 1) {
      if (taken.has(idx)) continue;
      if (aliasSet.has(normalized[idx])) {
        found = idx;
        break;
      }
    }
    if (found != null) taken.add(found);
    out[field.key] = found;
  }

  return out;
}

function mapRowToLegacy(row: string[], mapping: Record<LegacyFieldKey, number | null>) {
  const pick = (key: LegacyFieldKey) => {
    const idx = mapping[key];
    if (idx == null) return "";
    return sanitizeCsvValue(row[idx] ?? "");
  };
  return {
    number: pick("number"),
    fullName: pick("fullName"),
    sex: pick("sex"),
    cpf: pick("cpf"),
    birthDate: pick("birthDate"),
    modality: pick("modality"),
    shirtSize: pick("shirtSize"),
    team: pick("team"),
  };
}

function isLegacyRowBlankOrNumberOnly(legacy: ReturnType<typeof mapRowToLegacy>): boolean {
  const hasOtherData = [
    legacy.fullName,
    legacy.sex,
    legacy.cpf,
    legacy.birthDate,
    legacy.modality,
    legacy.shirtSize,
    legacy.team,
  ].some((value) => value.trim().length > 0);
  return !hasOtherData;
}

function mapRowsToLegacy(rows: string[][], mapping: Record<LegacyFieldKey, number | null>) {
  return rows.map((row) => mapRowToLegacy(row, mapping)).filter((legacy) => !isLegacyRowBlankOrNumberOnly(legacy));
}

function buildLegacyCsv(rows: string[][], mapping: Record<LegacyFieldKey, number | null>): string {
  const header = [...LEGACY_HEADERS].map(csvEscape).join(",");
  const mappedRows = mapRowsToLegacy(rows, mapping).map((legacy) => {
    const cells = [
      legacy.number,
      legacy.fullName,
      legacy.sex,
      legacy.cpf,
      legacy.birthDate,
      legacy.modality,
      legacy.shirtSize,
      legacy.team,
    ];
    return cells.map(csvEscape).join(",");
  });
  return [header, ...mappedRows].join("\n");
}

function decodeUtf8OrWindows1252(content: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8");
  const utf8Text = utf8.decode(content);
  if (!utf8Text.includes("\uFFFD")) {
    return utf8Text;
  }
  return new TextDecoder("windows-1252").decode(content);
}

export function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("json_sync");
  const [file, setFile] = useState<File | null>(null);
  const [parsedJson, setParsedJson] = useState<PullResponse | null>(null);
  const [legacyCsv, setLegacyCsv] = useState<ParsedCsv | null>(null);
  const [legacyMapping, setLegacyMapping] = useState<Record<LegacyFieldKey, number | null>>(
    () =>
      LEGACY_FIELDS.reduce(
        (acc, field) => {
          acc[field.key] = null;
          return acc;
        },
        {} as Record<LegacyFieldKey, number | null>,
      ),
  );
  const [dragOver, setDragOver] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [legacyImportResult, setLegacyImportResult] = useState<LegacyImportResponse | null>(null);

  const resetParsedState = useCallback(() => {
    setParsedJson(null);
    setLegacyCsv(null);
    setLegacyMapping(
      LEGACY_FIELDS.reduce(
        (acc, field) => {
          acc[field.key] = null;
          return acc;
        },
        {} as Record<LegacyFieldKey, number | null>,
      ),
    );
    setLegacyImportResult(null);
  }, []);

  const readFile = useCallback(
    (f: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          if (mode === "json_sync") {
            if (!(reader.result instanceof ArrayBuffer)) {
              throw new Error("Arquivo inválido");
            }
            const text = new TextDecoder("utf-8", { fatal: true }).decode(reader.result);
            const data = JSON.parse(text) as PullResponse;
            if (!data.eventId || !Array.isArray(data.participants)) {
              throw new Error("JSON inválido");
            }
            setParsedJson(data);
            setLegacyCsv(null);
            return;
          }
          if (!(reader.result instanceof ArrayBuffer)) {
            throw new Error("Arquivo inválido");
          }
          const text = repairMojibakeConservative(decodeUtf8OrWindows1252(reader.result));
          const parsed = parseGenericCsv(text);
          setLegacyCsv(parsed);
          setLegacyMapping(autoMapHeaders(parsed.headers));
          setParsedJson(null);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Arquivo inválido");
          resetParsedState();
        }
      };
      reader.readAsArrayBuffer(f);
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

  const mappingValidation = useMemo(() => {
    const requiredKeys = LEGACY_FIELDS.filter((field) => field.required).map((field) => field.key);
    const selectedRequired = requiredKeys.map((key) => legacyMapping[key]).filter((v) => v != null) as number[];
    const hasAllRequired = requiredKeys.every((key) => legacyMapping[key] != null);
    const uniqueRequired = new Set(selectedRequired).size === selectedRequired.length;
    return { hasAllRequired, uniqueRequired, valid: hasAllRequired && uniqueRequired };
  }, [legacyMapping]);
  const mappedLegacyRows = useMemo(
    () => (legacyCsv ? mapRowsToLegacy(legacyCsv.rows, legacyMapping) : []),
    [legacyCsv, legacyMapping],
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      if (mode === "json_sync") {
        if (!parsedJson) throw new Error("Selecione um arquivo JSON válido");
        return postImportJson(parsedJson);
      }
      if (!file || !legacyCsv) throw new Error("Selecione um arquivo CSV válido");
      if (!mappingValidation.valid) {
        throw new Error("Preencha o mapeamento obrigatório do CSV");
      }
      if (!eventName.trim() || !eventStartDate.trim()) {
        throw new Error("Preencha Nome do evento e Data inicial");
      }
      const csv = buildLegacyCsv(legacyCsv.rows, legacyMapping);
      const mappedFile = new File([csv], file.name || "legacy.csv", { type: "text/csv" });
      const form = new FormData();
      form.append("eventName", eventName.trim());
      form.append("eventStartDate", eventStartDate.trim());
      form.append("file", mappedFile);
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
  const showImportButton =
    mode === "json_sync" ? parsedJson != null : legacyCsv != null && mappingValidation.valid;
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
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
                <li>Pode ter colunas extras ou nomes diferentes</li>
                <li>Você precisará mapear as colunas obrigatórias</li>
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {mode === "legacy_csv" && legacyCsv != null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mapeamento do CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {LEGACY_FIELDS.map((field) => {
              const selected = legacyMapping[field.key];
              return (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`map-${field.key}`}>
                    {field.label} {field.required ? "*" : "(opcional)"}
                  </Label>
                  <select
                    id={`map-${field.key}`}
                    aria-label={`Mapear ${field.label}`}
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={selected == null ? "" : String(selected)}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLegacyMapping((prev) => ({
                        ...prev,
                        [field.key]: value === "" ? null : Number(value),
                      }));
                    }}
                  >
                    <option value="">{field.required ? "Selecione a coluna" : "Não usar"}</option>
                    {legacyCsv.headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={String(index)}>
                        {header || `Coluna ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {!mappingValidation.hasAllRequired ? (
              <p className="text-sm text-destructive">Selecione todas as colunas obrigatórias.</p>
            ) : null}
            {mappingValidation.hasAllRequired && !mappingValidation.uniqueRequired ? (
              <p className="text-sm text-destructive">Colunas obrigatórias não podem se repetir.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
            <CardTitle className="text-lg">Preview - Participantes ({listJson.length})</CardTitle>
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

      {mode === "legacy_csv" && legacyCsv != null && mappingValidation.valid ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview - Participantes legado ({mappedLegacyRows.length})</CardTitle>
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
                  {mappedLegacyRows.map((legacy, index) => {
                    return (
                      <TableRow key={`${legacy.cpf}-${index}`}>
                        <TableCell>{legacy.number}</TableCell>
                        <TableCell>{legacy.fullName}</TableCell>
                        <TableCell>{legacy.sex || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{legacy.cpf}</TableCell>
                        <TableCell>{legacy.birthDate}</TableCell>
                        <TableCell>{legacy.modality || "-"}</TableCell>
                        <TableCell>{legacy.shirtSize || "-"}</TableCell>
                        <TableCell>{legacy.team || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
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
