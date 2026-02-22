import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getConnectionInfo, renewPairingToken } from "@/lib/takeout-api";
import { toast } from "sonner";

function pairingUrl(baseUrl: string, token: string) {
  const u = new URL(baseUrl);
  u.searchParams.set("token", token);
  return u.toString();
}

export function PairingCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["takeout", "connectionInfo"],
    queryFn: getConnectionInfo,
  });
  const renew = useMutation({
    mutationFn: renewPairingToken,
    onSuccess: (info) => {
      qc.setQueryData(["takeout", "connectionInfo"], info);
      toast.success("Token renovado");
    },
    onError: () => toast.error("Falha ao renovar token"),
  });
  const [copied, setCopied] = useState(false);

  const url = data ? pairingUrl(data.baseUrl, data.pairingToken) : "";

  const copyUrl = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copiada");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conectar app mobile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar app mobile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center rounded border bg-white p-2">
          <QRCodeSVG value={url} size={160} level="M" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Escaneie o QR no app mobile ou use a URL abaixo.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-muted px-2 py-1 text-xs">
              {url}
            </code>
            <Button variant="outline" size="sm" onClick={copyUrl}>
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => renew.mutate()}
            disabled={renew.isPending}
          >
            {renew.isPending ? "Renovando..." : "Renovar token"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
