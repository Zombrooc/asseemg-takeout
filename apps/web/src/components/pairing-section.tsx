import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, RotateCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

export interface PairingSectionProps {
  pairingUrl: string;
  expiresAt?: string;
  onRenewToken?: () => void;
  isRenewing?: boolean;
}

const QR_SIZE = 200;

export function PairingSection({
  pairingUrl,
  expiresAt,
  onRenewToken,
  isRenewing = false,
}: PairingSectionProps) {
  const [copied, setCopied] = useState(false);
  const expiresAtEpoch = Number(expiresAt ?? "0");
  const nowEpoch = Math.floor(Date.now() / 1000);
  const isTokenExpired = expiresAtEpoch > 0 && expiresAtEpoch <= nowEpoch;
  const expiresInMin =
    expiresAtEpoch > 0 ? Math.max(0, Math.ceil((expiresAtEpoch - nowEpoch) / 60)) : null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(pairingUrl);
    setCopied(true);
    toast.success("URL copiada para a area de transferencia");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Conectar App Mobile na LAN</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center rounded-lg border bg-white p-2 dark:bg-muted">
          <QRCodeSVG value={pairingUrl} size={QR_SIZE} level="M" aria-label="QR Code para pareamento" />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Escaneie com o app mobile ou acesse a URL manualmente. O mesmo QR funciona em multiplos aparelhos ate a expiracao do token.
          </p>
          <p className={cn("text-xs", isTokenExpired ? "text-amber-600" : "text-muted-foreground")}>
            {isTokenExpired
              ? "Token expirado. O desktop vai gerar um novo automaticamente."
              : expiresInMin != null
                ? `Token valido por cerca de ${expiresInMin} min`
                : "Validade do token indisponivel"}
          </p>
          <code className="block max-w-full truncate rounded-md border bg-muted px-3 py-2 text-xs">
            {pairingUrl}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              aria-label="Copiar URL"
            >
              <Copy className="size-4 shrink-0" aria-hidden />
              {copied ? "Copiado" : "Copiar URL"}
            </Button>
            {onRenewToken != null && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRenewToken}
                disabled={isRenewing}
                aria-label="Renovar token"
              >
                <RotateCw
                  className={cn("size-4 shrink-0", isRenewing && "animate-spin")}
                  aria-hidden
                />
                {isRenewing ? "Renovando..." : "Renovar Token"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
