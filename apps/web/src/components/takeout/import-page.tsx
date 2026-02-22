import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { postImport } from "@/lib/takeout-api";
import { toast } from "sonner";

function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const row: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === "," && !inQuotes) || c === "\n") {
        row.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    row.push(cur.trim());
    return row;
  });
}

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<string[][]>([]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRows(parseCsv(text));
    };
    reader.readAsText(f, "utf-8");
  }, []);

  const importMutation = useMutation({
    mutationFn: (f: File) => postImport(f),
    onSuccess: (res) => {
      toast.success(`${res.imported} linha(s) importada(s)`);
      if (res.errors.length) toast.error(res.errors.join("; "));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao importar"),
  });

  const handleImport = () => {
    if (!file) {
      toast.error("Selecione um arquivo CSV");
      return;
    }
    importMutation.mutate(file);
  };

  const [header, ...body] = rows;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">Importar CSV</h1>

      <div className="flex flex-wrap items-center gap-4">
        <label className="cursor-pointer">
          <span className="sr-only">Selecionar CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFileChange}
          />
          <Button type="button" variant="outline" asChild>
            <span>Selecionar arquivo</span>
          </Button>
        </label>
        {file && (
          <span className="text-sm text-muted-foreground">{file.name}</span>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {header?.map((cell, i) => (
                    <TableHead key={i}>{cell}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {body.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {body.length > 20 && (
            <p className="text-sm text-muted-foreground">
              Mostrando 20 de {body.length} linhas
            </p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? "Importando..." : "Importar"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
